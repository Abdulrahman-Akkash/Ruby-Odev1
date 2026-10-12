# AGENT.md — Asist'te çalışan kodlama ajanları için kurallar

Bu dosya, bu repoda çalışan bir kodlama ajanının (Claude Code vb.) ve onu yöneten geliştiricinin
uyduğu çalışma sözleşmesidir. Proje boyunca ajanla birlikte yazıldı; her kural, çalışırken
karşılaştığımız gerçek bir duruma karşılık gelir (bkz. en alttaki "Neden bu kurallar?").

## 1. Ürün ne, ne değil?

- **Asist**, kurumsal destek yazılımlarının aort dilimini yapan bir yardım masasıdır:
  talep gelir → atanır → yanıtlanır → çözülür → kapanır, bir **SLA saatine** karşı.
- Farkı **Otomatik Pas**: vardiyası biten ajanın talepleri ve SLA'sı riske giren sahipsiz
  talepler vardiyadaki en az yüklü ajana kendiliğinden devredilir.
- **Marka kuralı (kesin):** uygulama içinde (view, layout, flash, seed, test verisi, `public/`)
  ilham kaynağı markanın adı veya logosu **asla** geçmez. Yalnızca `README.md`'de "ilham kaynağı" olarak geçebilir.
  Her değişiklikten sonra kontrol: `grep -ri zendesk app config public db test lib` → boş olmalı.

## 2. Komutlar

| Amaç | Komut |
|---|---|
| Kurulum | `bundle install && bin/rails db:prepare` |
| Sunucu | `bin/dev` (http://localhost:3000) |
| Testler | `bin/rails test` |
| Stil | `bin/rubocop` (düzeltme: `bin/rubocop -a`) |
| Güvenlik | `bin/brakeman --no-pager`, `bin/bundler-audit`, `bin/importmap audit` |
| Zaman kurallarını işlet | `bin/rails asist:sweep` |
| Demo verisini kur | `bin/rails asist:demo_reset` |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) bu kontrollerin hepsini çalıştırır.
**Push'tan önce yerelde aynılarını çalıştır.**

## 3. Mimari haritası

| Kavram | Dosya | Not |
|---|---|---|
| SLA hedefleri ve risk eşiği | `app/models/sla_policy.rb` | Zaman hesabının **tek** kaynağı. Başka yerde `+ 8.hours` yazma. |
| Durum makinesi | `app/models/ticket.rb` → `TRANSITIONS`, `transition_to!` | Durumu **asla** `update(status: …)` ile değiştirme; her zaman `transition_to!`. |
| Zaman kuralı tarayıcıları | `Ticket.notify_sla_risks!`, `notify_sla_breaches!`, `close_stale_solved!` | Hepsi `now:` parametresi alır; idempotent olmalı (iki kez çalışınca çift olay yazmaz). |
| Otomatik Pas | `app/models/auto_pass.rb` | Alıcı seçimi `pick_receiver`; yük = aktif (yeni + açık) talep sayısı. |
| Hepsini çalıştıran | `app/models/sweeper.rb` | PostgreSQL advisory lock ile tek seferde bir tarama. |
| Denetim kaydı | `app/models/ticket_event.rb` | Kullanıcıya görünen her otomatik işlem bir `TicketEvent` yazar. |
| Ajan paneli | `app/controllers/agent/*` | `Agent::BaseController` her istekte `Sweeper.run` çağırır. |
| Müşteri tarafı | `app/controllers/requests_controller.rb` | Girişsiz; talep `access_token` ile bulunur. |
| Demo verisi | `app/models/demo.rb` | Zamanlar "şimdi"ye göre geriye kaydırılır. |

## 4. Kod kuralları

- Rails 8 varsayılanları + `rubocop-rails-omakase`. Yeni gem eklemeden önce sor.
- İş kuralları modellerde (veya `app/models` altındaki PORO'larda); controller'lar ince.
- Arayüz metinleri **Türkçe**, kod (sınıf/metot/değişken) **İngilizce**.
- Zamanla ilgili her metot `now: Time.current` parametresi alır — test edilebilirlik için.
- Durum geçişi ya da atama yapan her metot bir `TicketEvent` yazar.
- Veritabanı her ortamda PostgreSQL (prod = Render). SQLite'a özgü kod yazma.
- Kimlik bilgisi/anahtar commit'leme. Prod sırları Render ortam değişkenlerindedir (`render.yaml`).

## 5. Test kuralları

- **Zaman kuralı = `travel_to` testi.** Her zaman kuralı için *eşikten 1 dk önce olmaz, eşikte olur* çifti yazılır
  (örnek: `test/models/ticket_sla_test.rb`). Çıpa zaman: `T0` (`test/test_helper.rb`).
- **Durum geçişi = hem izinli hem yasak yol testi** (`test/models/ticket_status_test.rb`).
- Yeni kullanıcıya görünen akış → `test/integration/` altında HTTP seviyesinde test.
- Test verisi testin içinde oluşturulur (`create_ticket`); kullanıcılar `test/fixtures/users.yml`'dan.

## 6. "Yaptım" demeden önce (Definition of Done)

1. `bin/rails test` → **0 failure, 0 error**. Çıktının son satırını olduğu gibi raporla; tahmin etme.
2. `bin/rubocop`, `bin/brakeman` temiz.
3. Değişiklik arayüze dokunuyorsa sunucuyu açıp sayfayı gerçekten gez (curl veya tarayıcı); sadece testlere güvenme.
4. README'deki **Kod haritası** satır numaraları hâlâ doğru mu? Değiştiyse güncelle.
5. Yapamadığın veya yarım kalan her şeyi README → **Yapamadıklarım** bölümüne yaz. Eksik saklanmaz.
6. Çalıştırmadığın bir komutun sonucunu, açmadığın bir sayfanın içeriğini **asla** "yaptım/gördüm" diye raporlama.

## 7. Kaynak ve araştırma kuralları

- README'deki her rakamın yanında link olur; kaynaksız rakam yazılmaz.
- Kaynağı doğrudan açamadıysan (ağ kısıtı vb.) bunu açıkça not et.
- Kullanıcı yorumu alıntıları birebir kopyalanır, uydurulmaz ve linki verilir.

## 8. Git

- Geliştirme branch'i: `claude/fortune-500-saas-analysis-gymmw1`. `main`'e doğrudan push yok.
- Commit mesajları Türkçe, ne ve neden.

---

### Neden bu kurallar?

- **Marka kuralı:** Ödevde orijinal markanın uygulamada görünmesi doğrudan 0 puan.
- **`transition_to!` zorunluluğu:** Durum değişikliklerinin tek kapıdan geçmesi, sunumda "durum geçişi kodu nerede?"
  sorusunun tek cevabı olsun ve geçmiş kaydı hiç atlanmasın diye.
- **Sweeper'ın vardiya değişiminden sonra çalışması:** Testler bir hata yakaladı — vardiyaya başlayan ajanın talepleri,
  istek başındaki tarama yüzünden o daha "vardiya dışı" görünürken başkasına pas ediliyordu.
  Çözüm: `Agent::ShiftsController` taramayı vardiya güncellendikten sonra çalıştırır. Bu tür sıralama hatalarını
  ancak HTTP seviyesindeki testler yakalar; bu yüzden 5. bölümdeki entegrasyon testi kuralı var.
- **"Kendin gör" kuralı:** Ajanın "yaptım" demesi yetmez; ödev, gerçekte çalıştırılmamış sonuç raporunu 0 puanla cezalandırıyor.
