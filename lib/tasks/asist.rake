namespace :asist do
  desc "Zaman kurallarını işlet (SLA hatırlatma/ihlal, Otomatik Pas, otomatik kapanış). Cron'dan dakikada bir çağrılabilir."
  task sweep: :environment do
    result = Sweeper.run
    puts "hatırlatma=#{result.warnings.size} ihlal=#{result.breaches.size} pas=#{result.passes.size} kapanan=#{result.closed.size}"
  end

  desc "Demo verisini 'şimdi'ye göre sıfırdan kur"
  task demo_reset: :environment do
    Demo.reset!
    puts "Demo verisi kuruldu. Şifre: #{Demo::PASSWORD}"
  end
end
