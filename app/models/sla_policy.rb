# İlk yanıt SLA'sı. Tüm zaman hesapları buradan geçer.
#
# Örn. "SLA hafta sonunu saymasın" gibi bir kural değişikliği yalnızca
# first_reply_due_at metoduna dokunur.
class SlaPolicy
  FIRST_REPLY_TARGETS = {
    "urgent" => 1.hour,
    "high"   => 4.hours,
    "normal" => 8.hours,
    "low"    => 24.hours
  }.freeze

  # Hedef sürenin son %25'ine girilen bilet "riskli" sayılır:
  # ajana hatırlatma düşer, sahipsizse Otomatik Pas devreye girer.
  AT_RISK_RATIO = 0.25

  def self.target_for(priority)
    FIRST_REPLY_TARGETS.fetch(priority.to_s)
  end

  def self.first_reply_due_at(priority, from)
    from + target_for(priority)
  end

  # Riskli bölgenin başladığı an (ör. normal: 8 saatin 6. saati).
  def self.warning_at(priority, due_at)
    due_at - (target_for(priority) * AT_RISK_RATIO)
  end
end
