<p align="center"><img src="docs/logo.svg" width="72" alt="Asist logosu"></p>

<h1 align="center">Asist</h1>
<p align="center"><em>Tam ayağına pas veren destek masası</em></p>

[![CI](https://github.com/Abdulrahman-Akkash/Ruby-Odev1/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdulrahman-Akkash/Ruby-Odev1/actions/workflows/ci.yml)

**Asist**, kurumsal müşteri destek yazılımlarının (ilham kaynağı: **Zendesk Support**) aort dilimini —
*talep gelir → atanır → yanıtlanır → çözülür → kapanır* — Ruby on Rails 8 ile uçtan uca çalışır hâle getirir
ve gerçek kullanıcı yorumlarından gelen bir acıyı çözer: **vardiyası biten ajanın talepleri sahipsiz kalıp SLA'yı kaçırmasın.**

| | |
|---|---|
| **Canlı URL** | **Henüz yok** — Render'a deploy bekliyor (Blueprint hazır; adımlar: [Deploy](#deploy-render), durum: [Yapamadıklarım](#yapamadıklarım)) |
| **Demo ajanları** | `ayse@asist.dev`, `mehmet@asist.dev`, `zeynep@asist.dev` — şifre `asist2026` |
| **Müşteri formu** | `/` (giriş gerekmez) |
| **Ajan paneli** | `/agent` |
| **Yığın** | Ruby 3.3.6 · Rails 8.1 · PostgreSQL · Hotwire (Turbo + Stimulus) · Propshaft · Minitest |

> Uygulamanın hiçbir ekranında, hata sayfasında veya dosyasında orijinal markanın adı ve logosu **yoktur**
> (`grep -ri zendesk app config public db lib test` → boş). Ürün adı ve logo (iki oyuncu arasında kavisli pas) Asist'e aittir.
> "Zendesk" adı yalnızca dokümanlarda (bu README, `AGENT.md`, `docs/SUNUM.md`) ilham kaynağı olarak geçer.

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

Fortune 500, ABD şirketlerinin **gelire** göre sıralamasıdır. 2025 listesine girme eşiği **7,4 milyar $ gelir**, 500 şirketin toplam piyasa değeri **~46 trilyon $**, toplam çalışan sayısı **~31 milyon** kişidir ([Fortune / PR Newswire, 2025](https://www.prnewswire.com/news-releases/fortune-announces-2025-fortune-500-list-302470158.html)). Haziran 2026'da yayımlanan listede toplam piyasa değeri **~55 trilyon $** ([Fortune, 2026](https://fortune.com/2026/06/03/fortune-500-2026-takeaways-nvidia-amazon-walmart/)), toplam çalışan **~30,5 milyon** ([Fortune, 2026](https://fortune.com/2026/06/19/fortune-500-employment-profits-revenue-hiring-jobs-ai/)).

| Soru | Yaklaşık cevap | Kaynak |
|---|---|---|
| **a. Değerleme aralığı** (piyasa değeri) | **~20 milyon $ → ~5 trilyon $**. En büyük: Nvidia ≈ 5,0 trilyon $ (Ağu 2026). Bulabildiğim en küçük: QVC Group (eski Qurate Retail) ≈ **19 milyon $** (Fortune profili, 31 Mar 2026; 2026 listesinde 433. sırada, geliri ≈ 9,5 milyar $; 2026'da Chapter 11 sürecinden geçti). TipRanks'e göre 7 Eki 2025'te ≈ 119 milyon $ idi. Zor durumda olmayan şirketler arasında da alt uç ~1 milyar $ civarındadır: Kohl's ≈ 1 milyar $'ın hemen üstü (Mart 2025; geliri ≈ 16,2 milyar $; 2026 listesinde 289.). Uçların tarihleri farklıdır (Nvidia Ağu 2026, QVC Mar 2026); piyasa değeri günlük değişir. Halka açık olmayan F500 şirketlerinin (karşılıklı sigortacılar, özel şirketler) piyasa değeri yoktur. | [Motley Fool — en büyük şirketler](https://www.fool.com/research/largest-companies-by-market-cap/) · [Fortune — QVC Group profili](https://fortune.com/company/qurate-retail/fortune500/) · [QVC Group 2026 F500 sırası](https://vista.today/2026/06/qvc-group-fortune-500-2026/) · [TipRanks — QVC Group piyasa değeri](https://www.tipranks.com/stocks/qvcga/market-cap) · [Motley Fool — Kohl's](https://www.fool.com/investing/2025/03/11/why-kohls-stock-is-plummeting-today/) · [Kohl's geliri (D&B/Morningstar)](https://www.dnb.com/business-directory/company-profiles.kohls_corporation.7133d85a919295a89bdc716ce739df50.html) · [Fortune 2026 — Kohl's 289.](https://fortune.com/2026/06/18/fortune-500-power-moves-june-12-18/) |
| **b. Çalışan sayısı aralığı** | **~500 → ~2,1 milyon**. En büyük: Walmart ≈ 2,1 milyon. En küçükler: 8 şirket 2.000'in altında; ör. Welltower 685, A-Mark Precious Metals ≈ 486. | [Walmart 10-K FY2025 (SEC)](https://www.sec.gov/Archives/edgar/data/104169/000010416925000021/wmt-20250131.htm) · [Fortune — "8 Fortune 500 companies with high revenue, low headcount"](https://fortune.com/2025/06/02/fortune-500-employees-headcount-workforce-largest-smallest/) · [Yahoo Finance kopyası](https://finance.yahoo.com/news/largest-fortune-500-company-2-094500793.html) · [Welltower proxy (SEC)](https://www.sec.gov/Archives/edgar/data/766704/000076670425000013/well-20250410.htm) |
| **c. Bir firmanın kullandığı SaaS ürünü sayısı** | **~650–700 uygulama**. Zylo: 10.000+ çalışanlı kurumlar ortalama **660** SaaS uygulaması (2025), 2026 endeksinde "yaklaşık 700". Fortune 500 şirketlerinde ortalama ~61.000 çalışan var (30,5 milyon / 500, Fortune 2026) ve 2025 listesinde yalnızca 8'inin 2.000'den az çalışanı vardı (b satırı); bu yüzden F500 şirketlerinin büyük çoğunluğunun bu 10.000+ sınıfında olduğunu varsayıyorum (kaba çıkarım: medyan çalışan sayısı için kaynak bulamadım). | [Zylo — SaaS istatistikleri](https://zylo.com/blog/saas-statistics) · [Zylo 2025 SaaS Management Index](https://zylo.com/news/2025-saas-management-index) |
| **d. SaaS aboneliklerine yıllık ödenen para** | **~250–300 milyon $ / yıl** (ortalama). Zylo 2025: büyük kurumlarda ortalama **284 milyon $**; 2026: ortalama ≈ **245 milyon $**, aralık **123,5–375,5 milyon $**. Çalışan başına ≈ **4.830 $** (2025). | [Zylo — SaaS istatistikleri](https://zylo.com/blog/saas-statistics) · [Zylo 2025 SaaS Management Index](https://zylo.com/news/2025-saas-management-index) · [PRWeb duyurusu](https://www.prweb.com/releases/2025-saas-management-index-reveals-first-increase-in-average-saas-spend-in-three-years-amid-rising-vendor-costs-and-rapid-ai-adoption-302351642.html) |

**Okuma:** tipik bir Fortune 500 firması yüzlerce SaaS ürününe yılda yüz milyonlarca dolar öder. Bunların her biri "çekirdeği kopyalanabilir" bir ürün; asıl değer, kullanıcının o üründe her gün yaşadığı acıyı çözen "tam ayağına pas"tadır.

---

## SaaS seçimi ve Fortune 500 kanıtı

**Seçim: Zendesk Support** (müşteri destek / ticketing). Aort dilimi: *talep gelir, atanır, yanıtlanır, çözülür* — ve bunların hepsi bir **SLA saatine** karşı yarışır.

Fortune 500 müşterileri (kanıt):

| Firma | Fortune 500 | Zendesk kullanımı |
|---|---|---|
| **Uber** | 2026 listesinde, gelir 52 milyar $ ([Fortune profili](https://fortune.com/company/uber-technologies/fortune500/)) | 2010'dan beri Zendesk Support; 1.000+ ajan, 10+ dil, sohbet ilk yanıt SLA'sı < 30 sn ([Zendesk — Uber müşteri hikâyesi](https://www.zendesk.com/customer/uber/)) |
| **Stanley Black & Decker** | Fortune 500, gelir ≈ 15,1 milyar $ ([Fortune profili](https://fortune.com/company/stanley-black-decker/fortune500/)) | Ayda ~10.000 talep, **1 saatlik ilk yanıt SLA'sına %100 uyum** iddiası ([Zendesk — Stanley Black & Decker](https://www.zendesk.co.uk/customer/stanley-black-decker)) |
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
Suite'in tamamı (Guide, Messaging, Talk, Explore, WFM, QA, AI ajanları, Marketplace) için ölçüm yapılamadı; ürün sayısına bakarak **birkaç milyon satır** olduğunu tahmin ediyorum (ölçüm değil). Ödevin "~300 bin satırlık kurumsal ürün" ölçeğinin rahatça üstünde.

### Çekirdeği bugünün coding agent'larıyla üretmek ne tutar?

Varsayımlar (tahmindir, ölçüm değildir):
- Hedef: ~300.000 satırlık çekirdek (Zammad'ın yarısından az).
- Bu ödevde gözlenen hız: ilk sürümde ~2.000 satır (uygulama + test) ~40 dakikada, yani ≈ 3.000 satır/saat. Kurumsal ölçek için daha temkinli **2.000 satır/saat** ve karmaşıklık (entegrasyonlar, veri göçleri, yetkiler, performans, yeniden yazma) için **×4 rework** payı varsaydım.
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
| Araç | Claude Code (claude.ai/code bulut oturumu) |
| Abonelik | **Claude Pro — 20 $/ay.** Bu ödev için ayrıca API/token faturası **ödenmedi**; ödevin ek maliyeti 0 $ (aylık ücretin tamamı sayılırsa 20 $). |
| İlk sürüm | 12 Eki 2026, tek oturum, ~40 dk (ilk komut 13:36 UTC, ilk sürüm commit'i 13:59 UTC, push 14:13 UTC): araştırma + uygulama + testler + doküman |
| Teslim öncesi denetim | 18 Eki 2026: denetim workflow'u — 7 denetçi + 2 doğrulayıcı + 1 eksiklik eleştirmeni = 10 alt-ajan (**1,59 M token**, Claude Code raporu); kaynak araştırması workflow'u (**0,56 M + 0,52 M token**, iki koşu); son fark incelemesi (4 alt-ajan, **0,63 M token**); düzeltmeler. Pro planının oturum limitine bir kez takıldı (birkaç saat bekleme). |
| Üretilen kod | ~1.400 satır uygulama (`cloc app lib/tasks db/migrate`) + ~620 satır test (`cloc test`) |
| Barındırma | Render ücretsiz plan: 0 $ |

**Tahmin ile gerçeğin karşılaştırması:** aort dilimi (~2 bin satır) bir öğleden sonradan kısa sürdü ve sabit abonelik içinde kaldı; tahmin tablosundaki 300 bin satırlık çekirdek bunun ~150 katı. Asıl zaman, yazmaktan çok **doğrulamaya** gitti (denetim workflow'u 47 bulgu çıkardı; bkz. `AGENT.md` → "Neden bu kurallar?").

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
1. **İlk yanıt SLA'sı** — önceliğe göre hedef: Acil 1 sa · Yüksek 4 sa · Normal 8 sa · Düşük 24 sa ([`app/models/sla_policy.rb:6-11`](app/models/sla_policy.rb#L6)).
   Durum zamanla değişir: `on_track → at_risk (son %25) → breached` ([`ticket.rb:144`](app/models/ticket.rb#L144)).
2. **SLA hatırlatma ve ihlal kaydı** — risk bölgesine girildiği ve hedef aşıldığı an birer kez olay yazılır ([`ticket.rb:183`](app/models/ticket.rb#L183), [`ticket.rb:192`](app/models/ticket.rb#L192)); öncelik değişip eşik kayarsa yeniden değerlendirilir, geri dönerse çoğalmaz.
3. **Otomatik kapanış** — çözülen talep 4 gün içinde yeniden açılmazsa `closed` olur ([`ticket.rb:35`](app/models/ticket.rb#L35), [`ticket.rb:201`](app/models/ticket.rb#L201)). Tarama henüz çalışmamış olsa bile müşteri, süresi dolmuş talebe yazınca talep önce kapanır ([`ticket.rb:118`](app/models/ticket.rb#L118)).
4. **Vardiya bitişi** — ajanın `on_shift_until` anı geçince Otomatik Pas devreye girer (aşağıda).

Zaman kurallarını tek yerden işleten sınıf: [`app/models/sweeper.rb`](app/models/sweeper.rb). Üç yoldan çağrılır: her ajan isteği, kuyruk ekranının 30 sn'lik otomatik yenilemesi ve sunucu içi zamanlayıcı (`SWEEP_INTERVAL`). Elle: `bin/rails asist:sweep`. Müşterinin talep sayfası global taramayı değil, yalnız kendi talebinin kapanma kuralını işletir (`Ticket#close_if_due!`).

---

## Kullanıcı acısı ve çözümü (Otomatik Pas)

### Kimin acısı, hangi yorumdan?

**Zendesk yöneticileri ve destek ekip liderleri.** Kaynaklar gerçek kullanıcıların kalıcı linkli gönderileri; her alıntı bağımsız bir web aramasında metin ve link birlikte görülerek doğrulandı.

**1. İzne çıkan / vardiyası biten ajanın talepleri** — Zendesk Topluluğu, *"Out of Office app – official feature request thread"* (Eylül 2020'den beri, 55 yanıt):

> *"Please add the ability to schedule an agents out of office duration."*
> — [community.zendesk.com/ideas/out-of-office-app-official-feature-request-thread-16291](https://community.zendesk.com/ideas/out-of-office-app-official-feature-request-thread-16291)

> *"…all tickets are thrown back to the standard group and someone has to clean up the mess"* (ajanı tekrar "müsait" yapmayı unutunca)
> *"…none of the triggers related to the app unassigning tickets will work properly"* (izindeki 17 ajanın ~1.100 talebi etiketsiz kalınca)
> — [support.zendesk.com/…/4409217178522-Out-of-Office-app-official-feature-request-thread](https://support.zendesk.com/hc/en-us/community/posts/4409217178522-Out-of-Office-app-official-feature-request-thread)

> *"…even if an Agent is set as Unavailable via the app (so that no new tickets can be assigned to them), Routing still assigns tickets to them."*
> — [community.zendesk.com/ideas/give-admins-the-ability-to-change-agent-status-in-omnichannel-3600](https://community.zendesk.com/ideas/give-admins-the-ability-to-change-agent-status-in-omnichannel-3600)

**2. SLA'sı dolmak üzere olan talep için zamanında uyarı** — Zendesk Topluluğu fikirleri:

> *"…the smallest breach you can set up to be alerted is coming up, is an hour"*
> — [support.zendesk.com/…/4409217598490-SLA-Alerting-in-Minutes](https://support.zendesk.com/hc/en-us/community/posts/4409217598490-SLA-Alerting-in-Minutes)

> *"For our Severity 1 situations, we have a contractual obligation to do checks every 30 minutes until resolution which, as it stands, we can't automate like we can for everything else."*
> — [support.zendesk.com/…/4408860757274-Automation-Conditions-Based-on-Minutes-not-Hours](https://support.zendesk.com/hc/en-us/community/posts/4408860757274-Automation-Conditions-Based-on-Minutes-not-Hours)

> Eksiler: *"Need alerts and reminders to follow up on open/pending support cases"*
> — TrustRadius yorumu, "Zendesk: A User's Perspective" (2023): [trustradius.com/reviews/zendesk-support-suite-2023-09-29-15-35-05](https://www.trustradius.com/reviews/zendesk-support-suite-2023-09-29-15-35-05)

*Kapsam notu:* Asist bu ikinci grubun **ilk yanıt SLA'sı** kısmını çözer (dakika hassasiyetinde risk/ihlal kaydı, hatırlatma bandı, sahipsiz riskli talebin pas edilmesi). Çözülene kadar 30 dakikada bir kontrol ya da beklemedeki talepler için takip hatırlatması yoktur; bkz. [Yapamadıklarım](#yapamadıklarım).

### Zendesk bugün ne yapıyor, Asist'in farkı

| | Zendesk (bugün) | Asist |
|---|---|---|
| Ajan müsait değilken açık talepleri | Out of Office uygulamasında **"Force unassign tickets"** (varsayılan kapalı): ajanın durumu *elle* "unavailable" yapılınca açık talepleri gruba geri bırakır ([Zendesk Help](https://support.zendesk.com/hc/en-us/articles/4408828358682-Installing-and-using-the-Out-of-Office-app)). Omnichannel routing: durum değişince en fazla **50** açık **e-posta/messaging** talebini 1 dk gecikmeyle yeniden atar ([Zendesk Help](https://support.zendesk.com/hc/en-us/articles/4828787357210-Managing-your-omnichannel-routing-configuration)) | Vardiyanın **bitiş saati planlanır**; saat gelince kimsenin bir şey yapmasına gerek kalmadan ajanın tüm yeni/açık talepleri vardiyadaki **en az yüklü ajana** pas edilir (gruba bırakılmaz, adet ve kanal sınırı yok) |
| SLA riskine yaklaşan talep | Otomasyonlar **saatte bir** çalışır; uyarı ihlalden bir saat önce veya sonra gelebilir ([Zendesk Help](https://support.zendesk.com/hc/en-us/articles/4408820131994-Workflow-How-to-alert-your-team-to-tickets-nearing-an-SLA-breach)) | Risk ve ihlal anları **dakikalar içinde** talep geçmişine yazılır, ajana hatırlatma bandı çıkar; **sahipsiz** riskli talep kendiliğinden pas edilir |
| Pas/atamanın izi | Tetikleyici ve uygulama kayıtları ayrı yerlerde | Her pas *kime ve neden* bilgisiyle **Pas akışı** ekranında |

Zendesk'in yeni özellikleri boşluğu kısmen kapatıyor; Asist'in katkısı bunu **elle durum değişikliği beklemeden, vardiya saatine bağlı ve dakika hassasiyetinde** yapması.

### Asist'in çözümü — Otomatik Pas
[`app/models/auto_pass.rb`](app/models/auto_pass.rb)

1. **Vardiyası biten ajanın** yeni/açık talepleri, vardiyadaki **en az yüklü** ajana kendiliğinden pas edilir (vardiya süresi dolunca da, "Vardiyayı bitir"e basınca da).
2. **Sahipsiz talep SLA risk bölgesine girdiği dakika** (hedefin son %25'i) en az yüklü ajana pas edilir — saatlik otomasyon beklenmez.
3. Vardiya dışındaki ajanın **beklemedeki talebine müşteri yazarsa** talep anında vardiyadaki ajana geçer.
4. Ajanın kendi riskli talepleri kuyruğun üstünde **SLA hatırlatma bandı** olarak görünür; risk ve ihlal anları talep geçmişine yazılır.
5. Kimse vardiyada değilse talepler yerinde kalır; **vardiyaya ilk giren ajana** bekleyen işler pas edilir.
6. Her pasın *kime ve neden* yapıldığı **Pas akışı** ekranında (`/agent/passes`) görünür.

**Tek cümle (sunum için, ~20 sn):** *"Zendesk yöneticileri kendi topluluk forumunda, izindeki ajanın taleplerini elle toplamaktan ve bir saatten yakın SLA uyarısı kuramamaktan yakınıyor; Asist'in Otomatik Pas'ı bu talepleri vardiya bitince ve SLA riski başlayınca dakikalar içinde vardiyadaki en az yüklü ajana kendiliğinden devrediyor."* (Kaynaklar: yukarıdaki iki ayrı forum başlığı.)

---

## Kod haritası — "bu kural nerede?"

Sunumdaki kod yeri sorusu için. Satır numaraları `main`'deki son commit'e göre; "Yan etki" sütunu, değişiklikle birlikte güncellenmesi gereken test/demo satırlarıdır.

| Değişiklik isteği | Dokunulacak yer | Yan etki |
|---|---|---|
| **SLA hafta sonunu saymasın** / mesai 09–18 / resmî tatil | [`sla_policy.rb:21-23`](app/models/sla_policy.rb#L21) `first_reply_due_at`: `from + target` yerine iş takvimiyle ileri sar. **Ve** [`sla_policy.rb:26-28`](app/models/sla_policy.rb#L26) `warning_at`: risk anı da aynı takvimle geri sarılmalı (yoksa risk penceresi hafta sonuna düşer). Takvim saat dilimi: [`config/application.rb`](config/application.rb) `time_zone = "Istanbul"` | `ticket_sla_test.rb`'ye Cuma 17:00 → Pazartesi `travel_to` çifti |
| Acil SLA 30 dk olsun | [`sla_policy.rb:7`](app/models/sla_policy.rb#L7) `"urgent" => 1.hour` | `ticket_sla_test.rb:7`, `sweeper_test.rb`, `auto_pass_flow_test.rb` (SLA hatırlatma bandı testi) |
| Risk eşiği %25 değil %50 | [`sla_policy.rb:15`](app/models/sla_policy.rb#L15) `AT_RISK_RATIO` | Risk anı talepte saklı (`first_reply_risk_at`); mevcut talepler için demo sıfırlanmalı |
| `pending`'de SLA dursun | [`ticket.rb:147`](app/models/ticket.rb#L147) `sla_state`'e `pending` → `:paused`; [`ticket.rb:59`](app/models/ticket.rb#L59) `at_risk` ve [`ticket.rb:192`](app/models/ticket.rb#L192) ihlal sorgusunda `unsolved` yerine `active`; gerçek durdur-devam için `transition_to!` ([`ticket.rb:67`](app/models/ticket.rb#L67)) içinde bekleme süresini hedefe eklemek + migration | `application_helper.rb` `sla_badge` |
| Çözülen talep 7 günde kapansın | [`ticket.rb:35`](app/models/ticket.rb#L35) `AUTO_CLOSE_AFTER` | Demo ve testler sabiti kullanır; yalnız `ticket_sla_test.rb`'deki "4 gün" adlı testlerin adı |
| Beklemedeki talep doğrudan kapanabilsin | [`ticket.rb:25`](app/models/ticket.rb#L25) `"pending" => %w[open solved closed]` | `ticket_status_test.rb` yasak geçiş testi |
| Atama yeni talebi açık yapmasın | [`ticket.rb:98`](app/models/ticket.rb#L98) | `ticket_status_test.rb`, `aort_flow_test.rb` |
| Müşteri yanıtı çözülmüş talebi yeniden açmasın | [`ticket.rb:124`](app/models/ticket.rb#L124) `%w[pending solved]` → `%w[pending]` | `ticket_status_test.rb`, `aort_flow_test.rb` |
| Kapalı talebe yazan müşteriye yeni talep açılsın | [`ticket.rb:120`](app/models/ticket.rb#L120) `raise` yerine yeni talep oluştur; [`requests_controller.rb:28`](app/controllers/requests_controller.rb#L28) `reply` | `requests/show.html.erb` kapalı uyarısı |
| Yeni talep 15 dk içinde atanmazsa pas/eskalasyon | [`auto_pass.rb:43`](app/models/auto_pass.rb#L43) kural 2'ye `.or(Ticket.where(created_at: ..@now - 15.minutes))` | `auto_pass_test.rb`'ye `travel_to` çifti |
| Beklemedeki talepler de vardiya bitince pas edilsin | [`ticket.rb:31`](app/models/ticket.rb#L31) `ACTIVE_STATUSES` (yük hesabını da değiştirir) veya yalnız [`auto_pass.rb:38`](app/models/auto_pass.rb#L38) | `auto_pass_test.rb` "beklemedeki talep sahibinde kalır" |
| Pas en az yüklüye değil sırayla (round robin) | [`auto_pass.rb:61-63`](app/models/auto_pass.rb#L61) `pick_receiver` | `auto_pass_test.rb` yük dengesi testleri |
| Vardiya dışındaki ajana elle atama yapılamasın | [`ticket.rb:91`](app/models/ticket.rb#L91) `assign_to!` başında `raise unless user.on_shift?` | `demo.rb` Zeynep ataması, `ticket_status_test.rb` |
| Riskli talepte öncelik otomatik yükselsin | [`ticket.rb:183`](app/models/ticket.rb#L183) `notify_sla_risks!` içinde `change_priority!` | `ticket_sla_test.rb` |
| Kurallar 30 sn değil 10 sn'de bir işlesin | Sunucu: [`render.yaml`](render.yaml) `SWEEP_INTERVAL` + [`sweeper_ticker.rb:5`](config/initializers/sweeper_ticker.rb#L5). Tarayıcı: [`tickets/index.html.erb:3`](app/views/agent/tickets/index.html.erb#L3) `30000`, [`autorefresh_controller.js:6`](app/javascript/controllers/autorefresh_controller.js#L6); alt bilgi metni [`layouts/agent.html.erb:40`](app/views/layouts/agent.html.erb#L40) | — |
| Vardiya seçenekleri değişsin | [`user.rb:2-6`](app/models/user.rb#L2) `SHIFT_LENGTHS` | `auto_pass_flow_test.rb` "2 dakika (demo)" |
| Müşteri aciliyet seçemesin | [`requests_controller.rb`](app/controllers/requests_controller.rb) `ticket_params`'tan `:priority` çıkar; [`requests/new.html.erb`](app/views/requests/new.html.erb) seçim alanı | `aort_flow_test.rb` (form `priority: "high"` gönderiyor) |

---

## Testler ve CI

```bash
bin/rails test        # 53 test, 207 doğrulama (yerelde son koşu: 0 failure, 0 error)
```

| Dosya | Ne test ediyor |
|---|---|
| [`test/models/ticket_sla_test.rb`](test/models/ticket_sla_test.rb) | **Zaman kuralları** (`travel_to`) — SLA'nın `on_track → at_risk → breached` olması (5:59'da değil, 6:00'da risk), geç yanıt, iç notun yanıt sayılmaması, öncelik değişince hedefin yeniden hesaplanması, hatırlatma/ihlalin bir kez yazılması (öncelik ileri-geri değişince çoğalmaması), **zamanla gelen durum geçişi** `solved → closed` (4 gün − 1 dk'da kapanmayıp 4. günde kapanma), süresi dolmuş talebe müşterinin yazamaması, tarama ile müşteri yanıtının aynı talebi iki kez kapatmaması |
| [`test/models/ticket_status_test.rb`](test/models/ticket_status_test.rb) | **Durum geçişleri** (saat `travel_to` ile sabit) — izinli zincir, yasak geçişler, her geçişin kendi anının zaman damgasını bırakması (`new→open→solved→open→solved→closed`), atamanın `new→open` yapması, `pending/solved` gönderimi, müşteri yanıtının yeniden açması, kapalı talebe yazılamaması |
| [`test/models/auto_pass_test.rb`](test/models/auto_pass_test.rb) | **Otomatik Pas** — vardiya bitiminden 1 dk önce pas yok / bitiminde var, risk bölgesinde pas, yük dengesi, kimse yoksa bekleme, müşteri yanıtında anında pas |
| [`test/models/sweeper_test.rb`](test/models/sweeper_test.rb) | Tüm kuralların birlikte ve tekrar çalıştırıldığında çoğaltmadan işlemesi |
| [`test/integration/aort_flow_test.rb`](test/integration/aort_flow_test.rb) | **Uçtan uca HTTP akışı** — form → giriş → üstüne alma → yanıt → müşteri yanıtı → çözme → `travel_to` + 4 gün → kapanış; müşteri sayfasının da zaman kuralını işletmesi |
| [`test/integration/auto_pass_flow_test.rb`](test/integration/auto_pass_flow_test.rb) | "Vardiyayı bitir" düğmesi, son ajanın vardiyayı bitirmesi (talepler kalır, bildirim söyler), tarama kilidi meşgulken doğru bildirim, 2 dakikalık demo vardiyasının kendiliğinden bitmesi, SLA hatırlatma bandı ("kaldı" / "gecikti") |

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) her push ve PR'da şunları çalıştırır: Brakeman, bundler-audit, importmap audit, RuboCop ve PostgreSQL 17 servisiyle testler (runner `ubuntu-24.04`'e sabit). Rozet README'nin başında ve `main` dalının durumunu gösterir.

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

Repo bir **Render Blueprint** içerir ([`render.yaml`](render.yaml)): ücretsiz bir Ruby web servisi (`asist`) + ücretsiz PostgreSQL (`asist-db`), ikisi de Frankfurt bölgesinde, `main` dalından.

1. [dashboard.render.com](https://dashboard.render.com)'a GitHub hesabıyla gir. Render GitHub App'ine **bu repoya** erişim ver (Render ilk bağlantıda sorar).
2. **New → Blueprint** → bu repoyu seç → Render `render.yaml`'ı okur → **Apply**. (Çalışma alanında zaten bir ücretsiz Postgres varsa yenisi açılmaz; eskisini silmek gerekir. Render kart doğrulaması isteyebilir; ücretsiz planda ücret alınmaz.)
3. İlk build ~3–5 dk sürer. Build logunda `Using Ruby version 3.3.6`, `Bundle complete`, migration satırları ve `Demo verisi` seed'i görünmeli. [`bin/render-build.sh`](bin/render-build.sh): `bundle install` → asset derleme → `db:migrate` → `db:seed` (yalnızca boş veritabanında). `SECRET_KEY_BASE`'i Render kendisi üretir.
4. Servis "Live" olunca `https://<servis-adı>.onrender.com/up` **200** dönmeli; `/` müşteri formunu, `/session/new` demo hesaplarını göstermeli.
5. URL'yi bu README'nin başındaki **Canlı URL** satırına yaz, commit edip `main`'e push et (Render aynı commit'i yeniden deploy eder; servis 1–2 dk yeniden başlar).
6. Sunumdan hemen önce: giriş yap → **Ekip → Demo verisini sıfırla** → tekrar giriş (SLA saatleri "şimdi"ye göre yeniden kurulur).

Ücretsiz planda servis 15 dk istek gelmezse uyur; ilk istek ~1 dk sürebilir. Sunumdan birkaç dakika önce sayfayı açmak yeterli. Ücretsiz PostgreSQL oluşturulduktan **30 gün** sonra sona erer (14 gün ek süre, sonra silinir) ve hesap başına bir tane açılabilir ([Render — Free instances](https://render.com/docs/free)).

---

## Yapamadıklarım

Gizlemek yerine açıkça yazıyorum:

- **Canlı URL henüz yok.** Render Blueprint (`render.yaml`) ve build betiği hazır, production modunda yerelde prova edildi (`/up` 200, sunucu içi zamanlayıcı çalışıyor). Deploy öğrencinin Render hesabıyla yapılacak; URL o zaman README'nin başına yazılacak.
- **İleri tarihli izin/vardiya planlama yok.** Vardiya yalnız "şimdi" başlar, bitişi planlanır (2 dk / 4 sa / 8 sa); izinden dönen ajan elle "Vardiyaya başla"ya basar.
- **Takip hatırlatması yok.** Hatırlatma ve risk yalnız ilk yanıt SLA'sı için; beklemedeki/açık talepler için takip hatırlatması ve çözülene kadar periyodik kontrol üretilmez.

- **E-posta yok.** Müşteriye bildirim gitmez; müşteri talebini gizli bağlantıdan (`/t/:token`) takip eder ve oradan yanıtlar. Gelen e-postadan talep açma da yok.
- **Mesai takvimi yok.** SLA takvim saatleriyle sayılır (hafta sonu/tatil/mesai dışı dahil). Değişikliğin yeri: [`sla_policy.rb:21`](app/models/sla_policy.rb#L21).
- **Yalnızca ilk yanıt SLA'sı var.** "Sonraki yanıt" ve "çözüm süresi" SLA'ları, `pending`'de duraklayan sayaçlar yok.
- **Tek ekip, tek rol.** Grup/departman, yönetici rolü ve yetkilendirme yok; her ajan her talebi görür ve demo verisini sıfırlayabilir.
- **Demo şifresi herkese açık.** Giriş sayfası demo hesaplarını ve şifreyi gösterir (sunum ve değerlendirme kolaylığı için). Canlı URL'yi bilen herkes ajan olarak girip **Demo verisini sıfırla** ile veriyi silebilir; gerçek bir kurulumda bu düğme ve şifre olmaz.
- **Zaman kuralları sürekli bir arka plan işçisiyle değil, web süreci içinde çalışır** (her ajan/müşteri isteği + 30 sn'lik sayfa yenileme + Puma içinde 30 sn'lik zamanlayıcı). Render ücretsiz planda servis uyurken kural işlemez; uyanınca geriye dönük işler ve olay saati *işlendiği an* olarak yazılır. Gerçek kurulumda Solid Queue/cron ile dakikada bir çalışmalı.
- **Kanallar yok:** canlı sohbet, telefon, sosyal medya, yardım merkezi/bilgi bankası, raporlama panoları, makrolar, tetikleyici editörü yok.
- **Araştırma kaynağı notu:** Ajanın çalıştığı bulut ortamı G2/Capterra/Zendesk/Fortune sayfalarını doğrudan açamadı (ağ politikası). Kullanıcı alıntılarının her biri ve kilit rakamlar en az bir **bağımsız** web aramasında metin ve link birlikte görülerek doğrulandı; diğer rakamlar arama örneklemiyle kontrol edildi. İlk sürümde kullanılan bir G2 yorumu (AWS Marketplace'teki sayfalı kopyası) bu şekilde yeniden doğrulanamadığı için çıkarıldı ve yerine kalıcı linkli kaynaklar kondu. Linkler sunum öncesi tarayıcıda tek tek açılmalıdır.
- **Render ücretsiz PostgreSQL 30 gün sonra sona erer**; sunumdan sonra veri kalıcı değildir.
- **Hata sayfaları statik.** `public/*.html` Türkçe ve Asist markalı ama dinamik değil (ör. hangi talebin bulunamadığını söylemez).

---

<sub>İlham kaynağı: Zendesk Support. Bu proje bir ders ödevidir; Zendesk ile bağlantısı yoktur.</sub>
