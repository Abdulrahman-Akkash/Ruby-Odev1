class Ticket < ApplicationRecord
  class InvalidTransition < StandardError; end

  STATUS_LABELS = {
    "new"     => "Yeni",
    "open"    => "Açık",
    "pending" => "Beklemede",
    "solved"  => "Çözüldü",
    "closed"  => "Kapandı"
  }.freeze
  STATUSES = STATUS_LABELS.keys.freeze

  PRIORITY_LABELS = {
    "low"    => "Düşük",
    "normal" => "Normal",
    "high"   => "Yüksek",
    "urgent" => "Acil"
  }.freeze
  PRIORITIES = PRIORITY_LABELS.keys.freeze

  # Durum makinesi: bir durumdan yalnızca listelenen durumlara geçilebilir.
  TRANSITIONS = {
    "new"     => %w[open pending solved],
    "open"    => %w[pending solved],
    "pending" => %w[open solved],
    "solved"  => %w[open closed],
    "closed"  => []
  }.freeze

  # Ajandan aksiyon bekleyen durumlar (Otomatik Pas bunlara bakar).
  ACTIVE_STATUSES = %w[new open].freeze
  UNSOLVED_STATUSES = %w[new open pending].freeze

  # Zaman kuralı: çözülen talep bu süre içinde yeniden açılmazsa kapanır.
  AUTO_CLOSE_AFTER = 4.days

  belongs_to :assignee, class_name: "User", optional: true
  has_many :comments, -> { order(:created_at, :id) }, dependent: :destroy, inverse_of: :ticket
  has_many :events, -> { order(:created_at, :id) }, class_name: "TicketEvent", dependent: :destroy, inverse_of: :ticket

  has_secure_token :access_token

  normalizes :requester_email, with: ->(email) { email.strip.downcase }

  validates :subject, :description, :requester_name, presence: true
  validates :subject, length: { maximum: 200 }
  validates :requester_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :priority, inclusion: { in: PRIORITIES }
  validates :status, inclusion: { in: STATUSES }

  before_validation :apply_sla_policy, on: :create
  after_create { log!("created", "#{PRIORITY_LABELS[priority]} öncelik, ilk yanıt hedefi #{first_reply_due_at.strftime('%d.%m %H:%M')}") }

  scope :active, -> { where(status: ACTIVE_STATUSES) }
  scope :unsolved, -> { where(status: UNSOLVED_STATUSES) }
  scope :unassigned, -> { where(assignee_id: nil) }
  scope :awaiting_first_reply, -> { where(first_replied_at: nil) }
  scope :sla_order, -> { order(Arel.sql("tickets.first_replied_at IS NOT NULL"), :first_reply_due_at, :id) }
  scope :at_risk, ->(now = Time.current) { unsolved.awaiting_first_reply.where(first_reply_risk_at: ..now) }

  # ---- Durum geçişleri -----------------------------------------------------

  def can_transition_to?(target)
    TRANSITIONS.fetch(status).include?(target.to_s)
  end

  def transition_to!(target, actor: nil, reason: nil, now: Time.current)
    target = target.to_s
    return false if target == status
    unless can_transition_to?(target)
      raise InvalidTransition, "#{STATUS_LABELS[status]} → #{STATUS_LABELS.fetch(target, target)} geçişi yapılamaz"
    end

    from = status
    self.status = target
    case target
    when "solved" then self.solved_at = now
    when "closed" then self.closed_at = now
    when "open"   then self.solved_at = nil
    end
    save!

    message = "#{STATUS_LABELS[from]} → #{STATUS_LABELS[target]}"
    message += " (#{reason})" if reason
    log!("status_changed", message, actor:, data: { from:, to: target })
    true
  end

  # ---- Atama ---------------------------------------------------------------

  def assign_to!(user, actor: nil, kind: "assigned", message: nil)
    return false if assignee_id == user.id

    previous = assignee
    update!(assignee: user)
    log!(kind, message || user.name, actor:, data: { from: previous&.id, to: user.id })
    # Atanan yeni talep artık birinin üzerinde: new → open
    transition_to!("open", actor:) if status == "new"
    true
  end

  # ---- Yazışma ------------------------------------------------------------

  def reply_as_agent!(agent, body:, internal: false, submit_as: nil, now: Time.current)
    raise InvalidTransition, "Kapanmış talebe yanıt yazılamaz" if status == "closed"

    transaction do
      comments.create!(author: agent, body:, internal:)
      record_first_reply!(agent, now) if !internal && first_replied_at.nil?
      assign_to!(agent, actor: agent) if assignee.nil?
      target = submit_as.presence || (status == "new" && !internal ? "open" : nil)
      transition_to!(target, actor: agent, now:) if target
    end
  end

  def reply_as_customer!(body:, now: Time.current)
    # Tarama henüz çalışmamış olsa bile süresi dolan çözülmüş talep önce kapanır.
    transition_to!("closed", reason: auto_close_reason, now:) if auto_close_due?(now)
    raise InvalidTransition, "Bu talep kapandı. Lütfen yeni bir talep oluşturun." if status == "closed"

    transaction do
      comments.create!(body:)
      log!("customer_replied", "#{requester_name} yanıt yazdı")
      transition_to!("open", reason: "müşteri yanıtı", now:) if status.in?(%w[pending solved])
    end
    AutoPass.after_customer_reply(self, now:)
  end

  def change_priority!(new_priority, actor: nil)
    return false if new_priority == priority

    from = priority
    self.priority = new_priority
    # Hedef yeniden hesaplanır; hatırlatma/ihlal kayıtları yeni hedefe göre
    # yeniden değerlendirilir (bkz. notify_sla_risks!, notify_sla_breaches!).
    apply_sla_policy if first_replied_at.nil?
    save!
    log!("priority_changed", "#{PRIORITY_LABELS[from]} → #{PRIORITY_LABELS[priority]}", actor:)
  end

  # ---- SLA (zaman kuralı) --------------------------------------------------

  # :met | :breached | :at_risk | :on_track | :none
  def sla_state(now = Time.current)
    if first_replied_at
      first_replied_at <= first_reply_due_at ? :met : :breached
    elsif status.in?(%w[solved closed])
      :none
    elsif now > first_reply_due_at
      :breached
    elsif now >= first_reply_risk_at
      :at_risk
    else
      :on_track
    end
  end

  # Kalan süre (saniye). Negatifse SLA aşılmıştır.
  def sla_remaining(now = Time.current)
    first_reply_due_at - now
  end

  def auto_close_at
    solved_at + AUTO_CLOSE_AFTER if status == "solved" && solved_at
  end

  def auto_close_due?(now = Time.current)
    auto_close_at.present? && now >= auto_close_at
  end

  def auto_close_reason
    "#{AUTO_CLOSE_AFTER.in_days.to_i} gün içinde yeniden açılmadı"
  end

  # Zaman kuralı tarayıcıları (Sweeper çağırır) ----------------------------

  # Bir kayıt, yalnızca o anki eşikten SONRA yazıldıysa geçerlidir; öncelik
  # değişip eşik ileri kayarsa yeniden yazılır, geri dönerse çoğalmaz.
  def self.notify_sla_risks!(now: Time.current)
    at_risk(now).where("risk_notified_at IS NULL OR risk_notified_at < first_reply_risk_at")
                .where(first_reply_due_at: now..).find_each.map do |ticket|
      ticket.update!(risk_notified_at: now)
      ticket.log!("sla_warning", "ilk yanıta #{HumanDuration.short(ticket.sla_remaining(now))} kaldı")
      ticket
    end
  end

  def self.notify_sla_breaches!(now: Time.current)
    unsolved.awaiting_first_reply.where("breach_notified_at IS NULL OR breach_notified_at < first_reply_due_at")
            .where(first_reply_due_at: ...now).find_each.map do |ticket|
      ticket.update!(breach_notified_at: now)
      ticket.log!("sla_breached", "ilk yanıt hedefi #{ticket.first_reply_due_at.strftime('%d.%m %H:%M')} idi")
      ticket
    end
  end

  def self.close_stale_solved!(now: Time.current)
    where(status: "solved").where(solved_at: ..(now - AUTO_CLOSE_AFTER)).find_each.map do |ticket|
      ticket.transition_to!("closed", reason: ticket.auto_close_reason, now:)
      ticket
    end
  end

  def log!(kind, message, actor: nil, data: {})
    events.create!(kind:, message:, actor:, data:)
  end

  private
    def apply_sla_policy
      return if priority.blank? || !PRIORITIES.include?(priority)

      self.first_reply_due_at = SlaPolicy.first_reply_due_at(priority, created_at || Time.current)
      self.first_reply_risk_at = SlaPolicy.warning_at(priority, first_reply_due_at)
    end

    def record_first_reply!(agent, now)
      update!(first_replied_at: now)
      verdict = now <= first_reply_due_at ? "SLA karşılandı" : "SLA geç karşılandı"
      log!("first_reply", verdict, actor: agent)
    end
end
