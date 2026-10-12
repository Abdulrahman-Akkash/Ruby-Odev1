# Tüm zaman kurallarını tek seferde işler.
#
# Kim çağırır?
#   - Her ajan isteğinde (Agent::BaseController before_action)
#   - Ajan kuyruğu açıkken tarayıcı 30 sn'de bir sayfayı yeniler
#   - Sunucu içi zamanlayıcı (config/initializers/sweeper_ticker.rb, SWEEP_INTERVAL)
#   - Elle / cron: bin/rails asist:sweep
#
# Aynı anda iki tarama çakışmasın diye PostgreSQL advisory lock kullanılır.
class Sweeper
  LOCK_KEY = 4_242_001

  Result = Data.define(:warnings, :breaches, :passes, :closed) do
    def self.empty = new(warnings: [], breaches: [], passes: [], closed: [])

    def any? = [ warnings, breaches, passes, closed ].any?(&:any?)
  end

  def self.run(now: Time.current)
    Ticket.transaction do
      if Ticket.connection.select_value("SELECT pg_try_advisory_xact_lock(#{LOCK_KEY})")
        Result.new(
          warnings: Ticket.notify_sla_risks!(now:),
          breaches: Ticket.notify_sla_breaches!(now:),
          passes:   AutoPass.run(now:),
          closed:   Ticket.close_stale_solved!(now:)
        )
      else
        Result.empty
      end
    end
  end
end
