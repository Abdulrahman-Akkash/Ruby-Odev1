<p align="center"><img src="docs/logo.svg" width="72" alt="Asist logosu"></p>

<h1 align="center">Asist</h1>
<p align="center"><em>Tam ayağına pas veren destek masası</em></p>

[![CI](https://github.com/Abdulrahman-Akkash/Ruby-Odev1/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdulrahman-Akkash/Ruby-Odev1/actions/workflows/ci.yml)

**Asist**, kurumsal müşteri destek yazılımlarının (ilham kaynağı: **Zendesk Support**) aort dilimini —
*talep gelir → atanır → yanıtlanır → çözülür → kapanır* — Ruby on Rails 8 ile uçtan uca çalışır hâle getirir
ve gerçek kullanıcı yorumlarından gelen bir acıyı çözer: **vardiyası biten ajanın talepleri sahipsiz kalıp SLA'yı kaçırmasın.**

| | |
|---|---|
| **Canlı URL** | _Render deploy'undan sonra buraya eklenecek_ (adımlar: [Deploy](#deploy-render)) |
| **Demo ajanları** | `ayse@asist.dev`, `mehmet@asist.dev`, `zeynep@asist.dev` — şifre `asist2026` |
| **Müşteri formu** | `/` (giriş gerekmez) |
| **Ajan paneli** | `/agent` |
| **Yığın** | Ruby 3.3.6 · Rails 8.1 · PostgreSQL · Hotwire (Turbo + Stimulus) · Propshaft · Minitest |

> Uygulamada orijinal markanın adı ve logosu **yoktur**; ürün adı ve logo (iki oyuncu arasında kavisli pas) Asist'e aittir.
> "Zendesk" adı yalnızca bu README'de ilham kaynağı olarak geçer.

---

## İçindekiler
1. [Faz 1 — Fortune 500 ve SaaS: genel tablo](#faz-1--fortune-500-ve-saas-genel-tablo)
2. [SaaS seçimi ve Fortune 500 kanıtı](#saas-seçimi-ve-fortune-500-kanıtı)
3. [Faz 2 — Satır sayısı ve maliyet tahmini](#faz-2--satır-sayısı-ve-maliyet-tahmini)
4. [Aort dilimi](#aort-dilimi)
5. [Kullanıcı acısı ve çözümü (Otomatik Pas)](#kullanıcı-acısı-ve-çözümü-otomatik-pas)
6. [Kod haritası — "bu kural nerede?"](#kod-haritası--bu-kural-nerede)
7. [Testler ve CI](#testler-ve-ci)
8. [Yerelde çalıştırma](#yerelde-çalıştırma)
9. [Deploy (Render)](#deploy-render)
10. [Yapamadıklarım](#yapamadıklarım)

---

## Faz 1 — Fortune 500 ve SaaS: genel tablo

Fortune 500, ABD şirketlerinin **gelire** göre sıralamasıdır; 2025 listesine girme eşiği **7,4 milyar $ gelir**, 500 şirketin toplam piyasa değeri **~46 trilyon $**, toplam çalışan sayısı **~31 milyon** kişidir ([Fortune / PR Newswire, 2025](https://www.prnewswire.com/news-releases/fortune-announces-2025-fortune-500-list-302470158.html)).

| Soru | Yaklaşık cevap | Kaynak |
|---|---|---|
| **a. Değerleme aralığı** (piyasa değeri) | **~1 milyar $ → ~5 trilyon $**. En büyük: Nvidia ≈ 5,0 trilyon $ (Ağu 2026). En küçüklerden: Kohl's ≈ 1 milyar $'ın hemen üstü (Mart 2025; Kohl's 2025 Fortune 500'de, geliri ≈ 16,2 milyar $). Halka açık olmayan F500 şirketlerinin (karşılıklı sigortacılar, özel şirketler) piyasa değeri yoktur. | [Motley Fool — en büyük şirketler](https://www.fool.com/research/largest-companies-by-market-cap/) · [Motley Fool — Kohl's](https://www.fool.com/investing/2025/03/11/why-kohls-stock-is-plummeting-today/) · [Kohl's geliri (D&B/Morningstar)](https://www.dnb.com/business-directory/company-profiles.kohls_corporation.7133d85a919295a89bdc716ce739df50.html) |
| **b. Çalışan sayısı aralığı** | **~500 → ~2,1 milyon**. En büyük: Walmart ≈ 2,1 milyon. En küçükler: 8 şirket 2.000'in altında; ör. Welltower 685, A-Mark Precious Metals ≈ 486. | [Walmart 10-K FY2025 (SEC)](https://www.sec.gov/Archives/edgar/data/104169/000010416925000021/wmt-20250131.htm) · [Fortune — "8 Fortune 500 companies with high revenue, low headcount"](https://fortune.com/2025/06/02/fortune-500-employees-headcount-workforce-largest-smallest/) · [Yahoo Finance kopyası](https://finance.yahoo.com/news/largest-fortune-500-company-2-094500793.html) · [Welltower proxy (SEC)](https://www.sec.gov/Archives/edgar/data/766704/000076670425000013/well-20250410.htm) |
| **c. Bir firmanın kullandığı SaaS ürünü sayısı** | **~650–700 uygulama**. Zylo: 10.000+ çalışanlı kurumlar ortalama **660** SaaS uygulaması (2025), 2026 endeksinde "yaklaşık 700". (Fortune 500 şirketlerinin neredeyse tamamı bu sınıfta.) | [Zylo — SaaS istatistikleri](https://zylo.com/blog/saas-statistics) · [Zylo 2025 SaaS Management Index](https://zylo.com/news/2025-saas-management-index) |
| **d. SaaS aboneliklerine yıllık ödenen para** | **~250–300 milyon $ / yıl** (ortalama). Zylo 2025: büyük kurumlarda ortalama **284 milyon $**; 2026: ortalama ≈ **245 milyon $**, aralık **123,5–375,5 milyon $**. Çalışan başına ≈ **4.830 $** (2025). | [Zylo — SaaS istatistikleri](https://zylo.com/blog/saas-statistics) · [Zylo 2025 SaaS Management Index](https://zylo.com/news/2025-saas-management-index) · [PRWeb duyurusu](https://www.prweb.com/releases/2025-saas-management-index-reveals-first-increase-in-average-saas-spend-in-three-years-amid-rising-vendor-costs-and-rapid-ai-adoption-302351642.html) |

**Okuma:** tipik bir Fortune 500 firması yüzlerce SaaS ürününe yılda yüz milyonlarca dolar öder. Bunların her biri "çekirdeği kopyalanabilir" bir ürün; asıl değer, kullanıcının o üründe her gün yaşadığı acıyı çözen "tam ayağına pas"tadır.

---

## SaaS seçimi ve Fortune 500 kanıtı

**Seçim: Zendesk Support** (müşteri destek / ticketing). Aort dilimi: *talep gelir, atanır, yanıtlanır, çözülür* — ve bunların hepsi bir **SLA saatine** karşı yarışır.

Fortune 500 müşterileri (kanıt):

| Firma | Fortune 500 | Zendesk kullanımı |
|---|---|---|
| **Uber** | 2026 listesinde, gelir 52 milyar $ ([Fortune profili](https://fortune.com/company/uber-technologies/fortune500/)) | 2010'dan beri Zendesk Support; 1.000+ ajan, 10+ dil, sohbet ilk yanıt SLA'sı < 30 sn ([Zendesk — Uber müşteri hikâyesi](https://www.zendesk.com/customer/uber/)) |
| **Stanley Black & Decker** | Fortune 500, gelir ≈ 15,1 milyar $ ([Fortune profili](https://fortune.com/company/stanley-black-decker/fortune500/)) | 550 global ajan, **1 saatlik ilk yanıt SLA'sına %100 uyum** iddiası ([Zendesk — Stanley Black & Decker](https://www.zendesk.co.uk/customer/stanley-black-decker)) |
| Adı verilmeyen F500 finans/sigorta kuruluşu | Fortune 500 | Forrester TEI çalışması: ajan verimliliğinde %43 artış ([Zendesk blog](https://www.zendesk.com/blog/fortune-500-company-tei-spotlight/)) |

Zendesk kendi sayfasında "birçok Fortune 100 ve Fortune 500 şirketi" tarafından kullanıldığını ve Uber, Stanley Black & Decker, Tesco, Siemens gibi müşterilerini listeler ([Zendesk reviews sayfası](https://www.zendesk.com/service/comparison/zendesk-reviews/)).

**Orijinaline kim neden para ödüyor?** Destek operasyonu yöneten ekip liderleri; çünkü binlerce talebi tek kuyrukta toplayıp **"hiçbir müşteri söz verdiğimiz süreden fazla beklemesin" (SLA)** sözünü ölçülebilir hâle getiriyor.

---

## Faz 2 — Satır sayısı ve maliyet tahmini

### Zendesk kaç satır?

Zendesk'in kaynak kodu kapalı. Tahmini **aynı kategorideki iki açık kaynak Rails yardım masasını** bu ödev sırasında klonlayıp
[`cloc`](https://github.com/AlDanial/cloc) ile sayarak yaptım (node_modules/vendor/public hariç, JSON/YAML/Markdown hariç):

| Proje | Commit (12 Eki 2026) | Kod satırı | Dağılım |
|---|---|---|---|
| [Zammad](https://github.com/zammad/zammad) | `6342371` | **~775.000** (çeviri `.po` dosyaları hariç; dahil 1.488.390) | Ruby 376K · TypeScript 181K · Vue 64K · CoffeeScript 62K · JS 50K |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | `5974756` | **~488.000** | Ruby 205K · Vue 149K · JS 124K |

**Tahminim:** Zendesk Support'un yalnızca ticketing çekirdeği (talep, SLA, tetikleyici/otomasyon, görünümler, makrolar, ajan arayüzü, web formu, API) **≈ 400–800 bin satır**;
Suite'in tamamı (Guide, Messaging, Talk, Explore, WFM, QA, AI ajanları, Marketplace) **birkaç milyon satır**dır. Ödevin "~300 bin satırlık kurumsal ürün" ölçeğinin rahatça üstünde.

### Çekirdeği bugünün coding agent'larıyla üretmek ne tutar?

Varsayımlar (tahmindir, ölçüm değildir):
- Hedef: ~300.000 satırlık çekirdek (Zammad'ın yarısından az).
- Bu ödevde gözlenen hız: ~2.000 satır (uygulama + test) ~40 dakikada, yani ≈ 3.000 satır/saat. Kurumsal ölçek için daha temkinli **2.000 satır/saat** ve karmaşıklık (entegrasyonlar, veri göçleri, yetkiler, performans, yeniden yazma) için **×4 rework** payı varsaydım.
- Token: 1.000 nihai satır başına ≈ 3M girdi (%85'i cache okuması) + 80K çıktı token'ı. Fiyatlar Claude Opus 5.5 API: girdi 4 $/MTok, cache okuma 0,20 $/MTok, çıktı 20 $/MTok ([Claude API fiyatlandırma](https://platform.claude.com/docs/en/about-claude/pricing)).

| Kalem | Hesap | Sonuç |
|---|---|---|
| Satır başına token maliyeti | 2,55M × 0,20 $ + 0,45M × 4 $ + 0,08M × 20 $ | ≈ **4 $ / 1.000 satır** |
| Ham üretim | 300 × 4 $ | ≈ 1.200 $ |
| ×4 rework ile **API token** | | ≈ **5.000 $** |
| Alternatif: **abonelik** | Claude Max 200 $/ay × 3 koltuk × 2 ay ([fiyatlar](https://www.heyuan110.com/posts/ai/2026-02-25-claude-code-pricing/)) | ≈ **1.200 $** |
| **Süre** | 300K satır ÷ 2K satır/saat × 4 ≈ 600 ajan-saati; 3 paralel ajan, günde ~8 saat | ≈ **25 iş günü (5 hafta)** |

Karşılaştırma: tek bir Fortune 500 firmasının yıllık SaaS faturası ~250 milyon $ (Faz 1-d). Kopyalamak ucuz; pahalı olan *doğru acıyı* bulmak.

### Gerçekte harcadığım (bu repo)

| Kalem | Değer |
|---|---|
| Araç | Claude Code (bulut oturumu) — ek API faturası yok, Claude aboneliği kapsamında |
| Aylık abonelik ücretim | **[öğrenci dolduracak: Pro 20 $ / Max 100 $ / Max 200 $]** |
| Ajan süresi | Araştırma + kod + test + doküman: tek oturum, ~40 dk (12 Eki 2026, 13:36–14:15 UTC; commit zamanlarından) |
| Üretilen kod | ~1.460 satır uygulama + ~510 satır test (`cloc app lib/tasks db/migrate …` / `cloc test`) |
| Barındırma | Render ücretsiz plan: 0 $ |

---

## Aort dilimi

Müşterinin destek yazılımına para ödemesinin asıl nedeni olan akış — uçtan uca çalışır:

```
Müşteri (/)                          Ajan (/agent)
───────────                          ─────────────
Talep formu ──► [new] ──── atama / ilk yanıt ────► [open] ──► yanıt "beklemede" ──► [pending]
                  │                                  ▲                                  │
                  │                                  └──── müşteri yanıt verir ◄────────┘
                  │                                  │
                  └──────────────► [solved] ◄────────┘   ── 4 gün yeniden açılmazsa ──► [closed]
                                     │  ▲
                                     └──┘ müşteri yanıt verirse yeniden [open]
```

### Durum akışı — `new > open > pending > solved > closed`
[`app/models/ticket.rb:22`](app/models/ticket.rb#L22) — izin verilen geçişler tek tabloda:

| Durumdan | Gidebileceği durumlar |
|---|---|
| `new` (Yeni) | `open`, `pending`, `solved` |
| `open` (Açık) | `pending`, `solved` |
| `pending` (Beklemede) | `open`, `solved` |
| `solved` (Çözüldü) | `open`, `closed` |
| `closed` (Kapandı) | — (son durum) |

Tablo dışı her geçiş `Ticket::InvalidTransition` fırlatır ve kullanıcıya hata olarak döner (ör. *"Yeni → Kapandı geçişi yapılamaz"*). Her geçiş talep geçmişine (`TicketEvent`) yazılır.

### Zaman kuralları
1. **İlk yanıt SLA'sı** — önceliğe göre hedef: Acil 1 sa · Yüksek 4 sa · Normal 8 sa · Düşük 24 sa ([`app/models/sla_policy.rb:6`](app/models/sla_policy.rb#L6)).
   Durum zamanla değişir: `on_track → at_risk (son %25) → breached` ([`ticket.rb:144`](app/models/ticket.rb#L144)).
2. **SLA hatırlatma ve ihlal kaydı** — risk bölgesine girildiği ve hedef aşıldığı an birer kez olay yazılır ([`ticket.rb:169`](app/models/ticket.rb#L169)).
3. **Otomatik kapanış** — çözülen talep 4 gün içinde yeniden açılmazsa `closed` olur ([`ticket.rb:35`](app/models/ticket.rb#L35), [`ticket.rb:185`](app/models/ticket.rb#L185)).
4. **Vardiya bitişi** — ajanın `on_shift_until` anı geçince Otomatik Pas devreye girer (aşağıda).

Zaman kurallarını tek yerden işleten sınıf: [`app/models/sweeper.rb`](app/models/sweeper.rb). Üç yoldan çağrılır: her ajan isteği, kuyruk ekranının 30 sn'lik otomatik yenilemesi ve sunucu içi zamanlayıcı (`SWEEP_INTERVAL`). Elle: `bin/rails asist:sweep`.

---

## Kullanıcı acısı ve çözümü (Otomatik Pas)

### Kimin acısı, hangi yorumdan?

> *"I really miss a feature **automatically reassigning tickets from agents not on shift** as well as **reminding agents of SLAs on their tickets**."*
> — Zendesk Support Suite, G2 yorumu (2021, takım lideri), AWS Marketplace'te yayımlanan kopyası:
> [aws.amazon.com/marketplace/reviews/reviews-list/B096T4WRF1?page=397](https://aws.amazon.com/marketplace/reviews/reviews-list/B096T4WRF1?page=397)

Aynı boşluğu doğrulayan kaynaklar:
- Zendesk'in kendi yardım merkezi: *"Tickets already assigned to an agent stay assigned when that agent is marked out of office"* — izne çıkan ajanın açık talepleri yerinde kalır, toplu elle atama önerilir ([Zendesk Help](https://support.zendesk.com/hc/en-us/articles/7974013029146-What-happens-to-tickets-when-an-agent-is-out-of-office), [manuel yeniden atama](https://support.zendesk.com/hc/en-us/articles/4408881839642-When-an-agent-is-out-of-office-how-can-I-reassign-their-open-tickets)).
- Zendesk otomasyonları **saatte bir** çalışır; SLA uyarısı ihlalden *bir saat önce veya bir saat sonra* gelebilir ([Zendesk Help — SLA ihlaline yaklaşan talepler](https://support.zendesk.com/hc/en-us/articles/4408820131994-Workflow-How-to-alert-your-team-to-tickets-nearing-an-SLA-breach)).
- Topluluk başlığı: *"Is there any way I can easily reassign tickets when an agent is off sick or on holiday?"* ([Zendesk Community](https://support.zendesk.com/hc/en-us/articles/227175047)).

### Asist'in çözümü — Otomatik Pas
[`app/models/auto_pass.rb`](app/models/auto_pass.rb)

1. **Vardiyası biten ajanın** yeni/açık talepleri, vardiyadaki **en az yüklü** ajana kendiliğinden pas edilir (vardiya süresi dolunca da, "Vardiyayı bitir"e basınca da).
2. **Sahipsiz talep SLA risk bölgesine girdiği dakika** (hedefin son %25'i) en az yüklü ajana pas edilir — saatlik otomasyon beklenmez.
3. Vardiya dışındaki ajanın **beklemedeki talebine müşteri yazarsa** talep anında vardiyadaki ajana geçer.
4. Ajanın kendi riskli talepleri kuyruğun üstünde **SLA hatırlatma bandı** olarak görünür; risk ve ihlal anları talep geçmişine yazılır.
5. Kimse vardiyada değilse talepler yerinde kalır; **vardiyaya ilk giren ajana** bekleyen işler pas edilir.
6. Her pasın *kime ve neden* yapıldığı **Pas akışı** ekranında (`/agent/passes`) görünür.

**Tek cümle (sunum için):** *"Zendesk kullanan destek ekibi liderinin G2 yorumundaki 'vardiyada olmayan ajanın taleplerini otomatik yeniden atayan ve SLA'yı hatırlatan özellik yok' acısını, Asist'te vardiyası biten ajanın ve SLA'sı riske giren sahipsiz talepleri dakikalar içinde vardiyadaki en az yüklü ajana otomatik pas eden 'Otomatik Pas' ile çözdüm."*

---

## Kod haritası — "bu kural nerede?"

| Değişiklik isteği | Dokunulacak yer |
|---|---|
| "SLA hafta sonunu saymasın" / mesai saatleri | [`app/models/sla_policy.rb:21-22`](app/models/sla_policy.rb#L21) — `first_reply_due_at`: `from + target` yerine iş günü/saati takvimiyle ileri sarma. Risk anı da buradan türer (`warning_at`). |
| "Acil SLA 30 dk olsun" | [`app/models/sla_policy.rb:6`](app/models/sla_policy.rb#L6) — `FIRST_REPLY_TARGETS` |
| "Risk eşiği %25 değil %50 olsun" | [`app/models/sla_policy.rb:15`](app/models/sla_policy.rb#L15) — `AT_RISK_RATIO` |
| "Çözülen talepler 7 gün sonra kapansın" | [`app/models/ticket.rb:35`](app/models/ticket.rb#L35) — `AUTO_CLOSE_AFTER` |
| "Beklemedeki talep doğrudan kapanabilsin" | [`app/models/ticket.rb:22`](app/models/ticket.rb#L22) — `TRANSITIONS["pending"]` |
| "Atama yeni talebi açık yapmasın" | [`app/models/ticket.rb:98`](app/models/ticket.rb#L98) |
| "Müşteri yanıtı çözülmüş talebi yeniden açmasın" | [`app/models/ticket.rb:116`](app/models/ticket.rb#L116) — `reply_as_customer!` |
| "Beklemedeki talepler de vardiya bitince pas edilsin" | [`app/models/ticket.rb:31`](app/models/ticket.rb#L31) — `ACTIVE_STATUSES` veya [`auto_pass.rb:36`](app/models/auto_pass.rb#L36) |
| "Pas en az yüklüye değil sırayla (round robin) gitsin" | [`app/models/auto_pass.rb:59`](app/models/auto_pass.rb#L59) — `pick_receiver` |
| "Kurallar 30 sn değil 10 sn'de bir işlesin" | `render.yaml` → `SWEEP_INTERVAL`, [`config/initializers/sweeper_ticker.rb`](config/initializers/sweeper_ticker.rb) |
| "Vardiya seçenekleri değişsin" | [`app/models/user.rb:2`](app/models/user.rb#L2) — `SHIFT_LENGTHS` |

---

## Testler ve CI

```bash
bin/rails test        # 44 test, 178 doğrulama (yerelde son koşu: 0 failure, 0 error)
```

| Dosya | Ne test ediyor |
|---|---|
| [`test/models/ticket_sla_test.rb`](test/models/ticket_sla_test.rb) | **Zaman kuralları** — `travel_to` ile SLA'nın `on_track → at_risk → breached` olması (5:59'da değil, 6:00'da risk), geç yanıt, iç notun yanıt sayılmaması, öncelik değişince hedefin yeniden hesaplanması, hatırlatma/ihlalin bir kez yazılması, 4 gün − 1 dk'da kapanmayıp 4. günde kapanma |
| [`test/models/ticket_status_test.rb`](test/models/ticket_status_test.rb) | **Durum geçişleri** — izinli zincir, yasak geçişler, atamanın `new→open` yapması, `pending/solved` gönderimi, müşteri yanıtının yeniden açması, kapalı talebe yazılamaması |
| [`test/models/auto_pass_test.rb`](test/models/auto_pass_test.rb) | **Otomatik Pas** — vardiya bitiminden 1 dk önce pas yok / bitiminde var, risk bölgesinde pas, yük dengesi, kimse yoksa bekleme, müşteri yanıtında anında pas |
| [`test/models/sweeper_test.rb`](test/models/sweeper_test.rb) | Tüm kuralların birlikte ve tekrar çalıştırıldığında çoğaltmadan işlemesi |
| [`test/integration/aort_flow_test.rb`](test/integration/aort_flow_test.rb) | **Uçtan uca HTTP akışı** — form → giriş → üstüne alma → yanıt → müşteri yanıtı → çözme → `travel_to` + 4 gün → kapanış |
| [`test/integration/auto_pass_flow_test.rb`](test/integration/auto_pass_flow_test.rb) | "Vardiyayı bitir" düğmesi, 2 dakikalık demo vardiyasının kendiliğinden bitmesi, SLA hatırlatma bandı |

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) her push ve PR'da şunları çalıştırır: Brakeman, bundler-audit, importmap audit, RuboCop ve PostgreSQL servisiyle testler. Rozet README'nin başında.

---

## Yerelde çalıştırma

```bash
bundle install
bin/rails db:prepare      # PostgreSQL; boş veritabanına demo verisini de kurar
bin/dev                   # http://localhost:3000
bin/rails asist:demo_reset   # demo verisini "şimdi"ye göre baştan kur
bin/rails asist:sweep        # zaman kurallarını elle işlet
```

---

## Deploy (Render)

Repo bir **Render Blueprint** içerir ([`render.yaml`](render.yaml)): ücretsiz bir Ruby web servisi + ücretsiz PostgreSQL.

1. [render.com](https://render.com)'da GitHub ile giriş yap → **New → Blueprint** → bu repoyu seç → **Apply**.
2. Render veritabanını oluşturur, [`bin/render-build.sh`](bin/render-build.sh) ile `bundle install`, asset derleme, `db:migrate` ve (boşsa) demo seed'ini çalıştırır, `SECRET_KEY_BASE`'i kendisi üretir.
3. Servis URL'si (`https://asist-….onrender.com`) bu README'nin başına yazılır.
4. Sunumdan hemen önce: giriş yap → **Ekip → Demo verisini sıfırla** (SLA saatleri "şimdi"ye göre yeniden kurulur).

Ücretsiz planda servis 15 dk istek gelmezse uyur; ilk istek ~1 dk sürebilir. Sunumdan birkaç dakika önce sayfayı açmak yeterli.

---

## Yapamadıklarım

Gizlemek yerine açıkça yazıyorum:

- **E-posta yok.** Müşteriye bildirim gitmez; müşteri talebini gizli bağlantıdan (`/t/:token`) takip eder ve oradan yanıtlar. Gelen e-postadan talep açma da yok.
- **Mesai takvimi yok.** SLA takvim saatleriyle sayılır (hafta sonu/tatil/mesai dışı dahil). Değişikliğin yeri: [`sla_policy.rb:21`](app/models/sla_policy.rb#L21).
- **Yalnızca ilk yanıt SLA'sı var.** "Sonraki yanıt" ve "çözüm süresi" SLA'ları, `pending`'de duraklayan sayaçlar yok.
- **Tek ekip, tek rol.** Grup/departman, yönetici rolü ve yetkilendirme yok; her ajan her talebi görür ve demo verisini sıfırlayabilir.
- **Zaman kuralları sürekli bir arka plan işçisiyle değil, web süreci içinde çalışır** (her ajan isteği + 30 sn'lik sayfa yenileme + Puma içinde 30 sn'lik zamanlayıcı). Render ücretsiz planda servis uyurken kural işlemez; uyanınca geriye dönük işler ve olay saati *işlendiği an* olarak yazılır. Gerçek kurulumda Solid Queue/cron ile dakikada bir çalışmalı.
- **Kanallar yok:** canlı sohbet, telefon, sosyal medya, yardım merkezi/bilgi bankası, raporlama panoları, makrolar, tetikleyici editörü yok.
- **Araştırma kaynağı notu:** Ajanın çalıştığı bulut ortamı G2/Capterra/Zendesk sayfalarını doğrudan açamadı; alıntılar ve linkler web arama sonuçlarından derlendi (G2 yorumunun AWS Marketplace kopyası dahil). Linkler sunum öncesi tarayıcıda tek tek kontrol edilmelidir.
- **Render ücretsiz PostgreSQL 30 gün sonra sona erer**; sunumdan sonra veri kalıcı değildir.

---

<sub>İlham kaynağı: Zendesk Support. Bu proje bir ders ödevidir; Zendesk ile bağlantısı yoktur.</sub>
