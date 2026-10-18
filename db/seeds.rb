# Demo verisi yalnızca veritabanı boşsa kurulur (Render her build'de seed çalıştırır).
# Sıfırdan kurmak için: bin/rails asist:demo_reset
Demo.seed_if_empty! unless Rails.env.test?
