# AGENT.md — Asist'te çalışan kodlama ajanları için kurallar

Bu dosya, bu repoda çalışan bir kodlama ajanının (Claude Code vb.) ve onu yöneten geliştiricinin
uyduğu çalışma sözleşmesidir. Proje boyunca ajanla birlikte yazıldı; her kural, çalışırken
karşılaştığımız gerçek bir duruma karşılık gelir (bkz. en alttaki "Neden bu kurallar?").

## 1. Ürün ne, ne değil?

- **Asist**, kurumsal destek yazılımlarının aort dilimini yapan bir yardım masasıdır:
  talep gelir → atanır → yanıtlanır → çözülür → kapanır, bir **SLA saatine** karşı.
- Farkı **Otomatik Pas**: vardiyası biten ajanın talepleri ve SLA'sı riske giren sahipsiz
  talepler vardiyadaki en az yüklü ajana kendiliğinden devredilir.
- **Marka kuralı (kesin):** uygulama içinde (kod ve yorumları, view, layout, flash, seed, test verisi, `public/`)
  ilham kaynağı markanın adı veya logosu **asla** geçmez. Yalnızca dokümanlarda (`README.md`, `AGENT.md`, `docs/`) "ilham kaynağı" olarak geçebilir.
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
   README'de yer tutucu (ör. "buraya eklenecek", "doldurulacak") bırakma; bilmediğin bir değeri uydurma, öğrenciye sor.
6. Çalıştırmadığın bir komutun sonucunu, açmadığın bir sayfanın içeriğini **asla** "yaptım/gördüm" diye raporlama.

## 7. Kaynak ve araştırma kuralları

- README'deki her rakamın yanında link olur; kaynaksız rakam yazılmaz.
- Kaynağı doğrudan açamadıysan (ağ kısıtı vb.) bunu açıkça not et.
- Kullanıcı yorumu alıntıları birebir kopyalanır, uydurulmaz ve linki verilir.
- Alıntı linki **kalıcı** olmalı (tekil yorum / forum gönderisi). Sayfalı liste linki (`?page=397`) zamanla kayar; yalnız yedek kaynak olarak kullanılır.
- Bir alıntı, onu bulan ajandan **bağımsız** bir aramayla (metin + URL aynı sonuçta) doğrulanmadan README'ye girmez.

## 7b. Teslim öncesi denetim

Teslimden önce bağımsız bir denetim yapılır (ajan workflow'u veya öğrencinin kendisi): ödevin her maddesi için kanıt
(komut çıktısı, dosya:satır, ekran görüntüsü), ardından bulguları **çürütmeye çalışan** ikinci bir göz.
`docs/SUNUM.md`'deki her demo adımı gerçek tarayıcıda, yazıldığı sırayla bir kez oynatılır.

## 8. Git

- **Teslim dalı `main`.** Render `main`'den deploy eder (`render.yaml` → `branch: main`) ve README'deki CI rozeti `main`'in durumunu gösterir.
- `main`'e yalnızca yerelde `bin/rails test`, `bin/rubocop` ve `bin/brakeman` temiz geçtikten sonra push edilir; push'tan sonra GitHub Actions sonucu kontrol edilir (kırmızıysa önce o düzeltilir).
- Ajanın kendi denemeleri `claude/...` dallarında yapılabilir; teslimden önce `main`'e alınır.
- Sunum günü (canlı demo sırasında) `main`'e push yapılmaz: Render yeniden deploy eder ve servis birkaç dakika kesilir.
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
- **Yer tutucu yasağı ve 7b denetimi (18 Eki):** 7 bağımsız denetçi + 2 doğrulayıcı + 1 eksiklik eleştirmeni (10 alt-ajan) 47 bulgu çıkardı. Öne çıkanlar:
  README'de doldurulmamış abonelik ücreti; `docs/SUNUM.md`'de yazıldığı sırayla oynanınca **hiçbir şey göstermeyen**
  bir demo adımı (sunumda "var" denip çalışmayan an = 0 puan riski); müşteri sayfası taramayı çalıştırmadığı için süresi
  dolmuş çözülmüş talebin müşteri yanıtıyla yeniden açılabilmesi; öncelik ileri-geri değişince ikinci "SLA ihlali" kaydı;
  sayfalı ve doğrulanamayan bir yorum linki; değerleme aralığının alt sınırının yanlış olması. Kod hataları yeni
  `travel_to` testleriyle, doküman hataları kaynaklarıyla düzeltildi.
- **"Kendin gör" kuralı:** Ajanın "yaptım" demesi yetmez; ödev, gerçekte çalıştırılmamış sonuç raporunu 0 puanla cezalandırıyor.
