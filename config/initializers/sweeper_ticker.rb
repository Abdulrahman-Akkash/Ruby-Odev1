# Sunucu içi zamanlayıcı: SWEEP_INTERVAL (saniye) verilirse, Puma süreci ayaktayken
# Sweeper bu aralıkla kendiliğinden çalışır — kimse sayfayı açmasa bile.
# Render ücretsiz planında ayrı worker/cron olmadığı için bu yol seçildi.
Rails.application.config.after_initialize do
  interval = ENV["SWEEP_INTERVAL"].to_i
  if interval.positive? && File.basename($PROGRAM_NAME).start_with?("puma")
    Thread.new do
      Thread.current.name = "asist-sweeper"
      loop do
        sleep interval
        begin
          Rails.application.executor.wrap { Sweeper.run }
        rescue => e
          Rails.logger.error("[asist-sweeper] #{e.class}: #{e.message}")
        end
      end
    end
  end
end
