# Otomatik Pas — kullanıcı acısının çözümü.
#
# Kaynak (ilham alınan ürünün topluluk forumu, "Out of Office app - official feature request thread"):
#   "Please add the ability to schedule an agents out of office duration."
#   "...all tickets are thrown back to the standard group and someone has to clean up the mess"
# ve "SLA Alerting in Minutes": "the smallest breach you can set up to be alerted is coming up, is an hour"
# (linkler: README → Kullanıcı acısı ve çözümü)
#
# Kurallar:
#   1. Vardiyası biten (on_shift_until geçmiş) ajanın yeni/açık talepleri,
#      vardiyadaki en az yüklü ajana pas edilir.
#   2. Sahipsiz bir talep SLA risk bölgesine girdiğinde (hedefin son %25'i)
#      vardiyadaki en az yüklü ajana pas edilir.
#   3. Vardiya dışındaki ajanın beklemedeki talebine müşteri yanıt verirse
#      talep anında vardiyadaki ajana pas edilir.
class AutoPass
  def self.run(now: Time.current)
    new(now:).run
  end

  def self.after_customer_reply(ticket, now: Time.current)
    return if ticket.assignee.nil? || ticket.assignee.on_shift?(now)

    new(now:).pass(ticket, reason: "#{ticket.assignee.name} vardiyada değil, müşteri yanıt verdi")
  end

  def initialize(now:)
    @now = now
    @receivers = User.on_shift(now).order(:id).to_a
    @load = Ticket.active.where(assignee_id: @receivers.map(&:id)).group(:assignee_id).count
  end

  def run
    return [] if @receivers.empty?

    passes = []

    Ticket.active.where.not(assignee_id: nil).where.not(assignee_id: @receivers.map(&:id))
          .includes(:assignee).sla_order.each do |ticket|
      passes << pass(ticket, reason: "#{ticket.assignee.name} vardiyada değil")
    end

    Ticket.active.unassigned.at_risk(@now).sla_order.each do |ticket|
      passes << pass(ticket, reason: "sahipsizdi, SLA'ya #{HumanDuration.short(ticket.sla_remaining(@now))} #{ticket.sla_remaining(@now).negative? ? 'gecikmiş' : 'kalmıştı'}")
    end

    passes.compact
  end

  def pass(ticket, reason:)
    receiver = pick_receiver(exclude_id: ticket.assignee_id)
    return if receiver.nil?

    @load[receiver.id] = @load.fetch(receiver.id, 0) + 1
    ticket.assign_to!(receiver, kind: "auto_pass", message: "→ #{receiver.name} (#{reason})")
    ticket
  end

  private
    # En az aktif (yeni + açık) talebi olan ajan; eşitlikte id sırası.
    def pick_receiver(exclude_id:)
      @receivers.reject { |user| user.id == exclude_id }.min_by { |user| [ @load.fetch(user.id, 0), user.id ] }
    end
end
