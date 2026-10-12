# Talebin denetim kaydı: durum değişiklikleri, atamalar, SLA olayları, otomatik paslar.
class TicketEvent < ApplicationRecord
  KIND_LABELS = {
    "created"          => "Oluşturuldu",
    "assigned"         => "Atama",
    "auto_pass"        => "Otomatik pas",
    "status_changed"   => "Durum",
    "priority_changed" => "Öncelik",
    "first_reply"      => "İlk yanıt",
    "customer_replied" => "Müşteri",
    "sla_warning"      => "SLA hatırlatma",
    "sla_breached"     => "SLA ihlali"
  }.freeze

  belongs_to :ticket, inverse_of: :events
  belongs_to :actor, class_name: "User", optional: true

  validates :kind, inclusion: { in: KIND_LABELS.keys }
  validates :message, presence: true

  scope :auto_passes, -> { where(kind: "auto_pass") }
  scope :recent_first, -> { order(created_at: :desc, id: :desc) }

  def label
    KIND_LABELS.fetch(kind)
  end

  def actor_name
    actor&.name || "Asist (sistem)"
  end
end
