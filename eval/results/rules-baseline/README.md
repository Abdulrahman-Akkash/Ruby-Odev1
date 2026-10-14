# Eval sonucu: rules-baseline

Üretim: `npm run eval:rules` · 2026-10-14

| Belge | Altın | Yakalanan | Kaçırılan | Yanlış alarm | Nötr | Recall | Recall (kategori dahil) | Precision |
|---|---|---|---|---|---|---|---|---|
| basecamp-privacy | 6 | 1 | 5 | 1 | 3 | 17% | 17% | 67% |
| basecamp-tos | 7 | 5 | 2 | 1 | 3 | 71% | 71% | 83% |
| github-tos | 13 | 8 | 5 | 8 | 6 | 62% | 54% | 58% |
| netflix-tos | 7 | 4 | 3 | 0 | 2 | 57% | 57% | 100% |
| spotify-tos | 19 | 16 | 3 | 14 | 12 | 84% | 79% | 63% |
| tiktok-tos | 7 | 4 | 3 | 3 | 1 | 57% | 43% | 63% |
| **Toplam** | **59** | **38** | **21** | **27** | 27 | **64%** | **59%** | **66%** |

F1 = 0.65. Eşleştirme kuralları ve etiketleme yönergesi: [eval/GUIDELINES.md](../../GUIDELINES.md).

## basecamp-privacy

### ✅ Yakalanan (1/6)

- **BP-04** `data_retention` — Veriler yasal yükümlülük ve uyuşmazlıklar için saklanabilir; IP kayıtları hesap süresince tutulur.  
  ↳ sistem: `data_retention/low` [C013] “keep this login data for as long as”

### ❌ Kaçırılan (5)

- **BP-01** `tracking_advertising/medium` — Reklamlara tıklayanların tarayıcısına üçüncü taraf reklam çerezi yerleştirilir ve veri gönderilir.  
  ↳ çapa: “we may load an ad-company script on their browsers that sets a third-party cookie and sends information to the ad network”
- **BP-02** `data_sharing/low` — E-posta adresinin tek yönlü özeti reklam şirketleriyle paylaşılabilir.  
  ↳ çapa: “we may disclose a one-way hash of your email address with ad companies”
- **BP-03** `data_sharing/medium` — Anonimleştirilmiş/toplu veri pazarlama dahil her amaçla kullanılabilir.  
  ↳ çapa: “We may use de-identified or aggregated data for any purpose, including marketing or analytics.”
- **BP-05** `data_sharing/medium` — Veriler ABD'ye aktarılır; kullanım aktarıma onay sayılır.  
  ↳ çapa: “any information you provide to us will be transferred to and stored in the United States”
- **BP-06** `tracking_advertising/low` — Gezinme analitiği hesabınıza bağlanır; üçüncü taraf çerezler kullanılır.  
  ↳ çapa: “these web analytics data are tied to your IP address and user account until your account is no longer active”

### ⚠️ Yanlış alarm (1)

- [C010] `data_sharing/medium` “sell your personal information to third part”  
  ↳ madde: We’ll never sell your personal information to third parties, and we won’t use your name or company in marketing statements without your permission either.

## basecamp-tos

### ✅ Yakalanan (5/7)

- **BC-01** `account_termination` — Hesap her an, herhangi bir sebeple kapatılabilir; içerik kaybedilir.  
  ↳ sistem: `account_termination/high` [C022] “terminate your account and refuse any and all current or future use of our Services for any reason”
- **BC-02** `liability_limitation` — Doğrudan zararlar dahil hiçbir zarardan sorumluluk kabul edilmez.  
  ↳ sistem: `liability_limitation/high` [C055] “not be liable”
- **BC-03** `liability_limitation` — Kullanım tamamen sizin riskinizde; hizmet "olduğu gibi".  
  ↳ sistem: `liability_limitation/medium` [C026] “as is””
- **BC-04** `unilateral_changes` — Koşullar güncellenebilir; kullanım en güncel koşulları kabul sayılır.  
  ↳ sistem: `unilateral_changes/medium` [C006] “may update these Terms”
- **BC-06** `price_change` — Mevcut müşterilerin fiyatları da değiştirilebilir (30 gün bildirim).  
  ↳ sistem: `price_change/medium` [C025] “change the pricing”

### ❌ Kaçırılan (2)

- **BC-05** `unilateral_changes/medium` — Hizmetin herhangi bir kısmı bildirimli/bildirimsiz değiştirilebilir veya kaldırılabilir.  
  ↳ çapa: “We reserve the right at any time to modify or discontinue, temporarily or permanently, any part of our Services with or without notice.”
- **BC-07** `cancellation_refund/medium` — Son dönemdeki kullanılmayan süre otomatik iade edilmez.  
  ↳ çapa: “We do not automatically prorate unused time in the last billing cycle.”

### ⚠️ Yanlış alarm (1)

- [C040] `data_sharing/medium` “provider”, not a “business” or “third part”  
  ↳ madde: Under the California Consumer Privacy Act (“CCPA”), 37signals is a “service provider”, not a “business” or “third party”, with respect to your use of the Services. That means we process any data you s…

## github-tos

### ✅ Yakalanan (8/13)

- **GH-02** `content_license` — Yapay zekâ girdi/çıktılarınız (vazgeçmediğiniz sürece) model eğitimi için kullanılır. ⚠️ kategori farklı  
  ↳ sistem: `data_sharing/medium` [C114] “share your Inputs or Outputs with third-part”
- **GH-03** `account_termination` — Erişim sebepli ya da sebepsiz, bildirimli ya da bildirimsiz, derhâl kapatılabilir.  
  ↳ sistem: `account_termination/high` [C149] “suspend or terminate your access to all or any part of the Website at any time, with or without cause”
- **GH-04** `cancellation_refund` — Peşin ödemeler iade edilmez; kısmi ay ya da düşürme için iade yok.  
  ↳ sistem: `cancellation_refund/high` [C138] “No Refunds”
- **GH-05** `liability_limitation` — Veri kaybı dahil dolaylı zararlardan sorumluluk reddi.  
  ↳ sistem: `liability_limitation/high` [C019] “not be liable”
- **GH-06** `liability_limitation` — Hizmet "olduğu gibi" sunulur; hiçbir garanti yok.  
  ↳ sistem: `liability_limitation/medium` [C017] “as is”
- **GH-07** `indemnification` — GitHub'ı tüm talep ve avukatlık masraflarına karşı tazmin edersiniz.  
  ↳ sistem: `indemnification/medium` [C173] “indemnify”
- **GH-09** `unilateral_changes` — Koşullar tek taraflı değiştirilebilir; devam eden kullanım kabul sayılır.  
  ↳ sistem: `unilateral_changes/medium` [C175] “may modify this agreement”
- **GH-11** `governing_law` — Kaliforniya hukuku ve San Francisco mahkemeleri yetkili.  
  ↳ sistem: `governing_law/low` [C178] “exclusive jurisdiction”

### ❌ Kaçırılan (5)

- **GH-01** `content_license/high` — İçeriğiniz GitHub ve iştiraklerinin (Microsoft) yapay zekâ modellerini eğitmek için kullanılabilir.  
  ↳ çapa: “including by training AI Features, and for the purpose of training, developing, and improving artificial intelligence and machine learning models and technologi…”
- **GH-08** `liability_limitation/medium` — Diğer kullanıcılarla uyuşmazlıklarda GitHub'ı tüm taleplerden ibra edersiniz.  
  ↳ çapa: “you agree to release GitHub from any and all claims, demands and damages”
- **GH-10** `unilateral_changes/medium` — Hizmet bildirimli/bildirimsiz değiştirilebilir veya sonlandırılabilir.  
  ↳ çapa: “We reserve the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Website (or any part of it) with or without not…”
- **GH-12** `data_retention/medium` — Hesap kapansa da bazı veriler saklanır; çatallanan/katkı içerik silinmez.  
  ↳ çapa: “We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements”
- **GH-13** `price_change/medium` — Fiyatlar ödeme dönemi sonunda değişebilir.  
  ↳ çapa: “prices are subject to change at the end of a payment term”

### ⚠️ Yanlış alarm (8)

- [C015] `account_termination/high` “cancel this agreement and close your Account at any time”  
  ↳ madde: You may cancel this agreement and close your Account at any time.
- [C127] `data_sharing/medium` “disclose, publish, or disseminate any Confidential Information to any third part”  
  ↳ madde: You agree that any non-public Beta Preview information we give you, such as information about a private Beta Preview, will be considered GitHub’s confidential information (collectively, “Confidential …
- [C144] `account_termination/high` “close your Account at any time”  
  ↳ madde: You may close your Account at any time. If you do, we'll treat your information responsibly.
- [C145] `account_termination/high` “cancel your Account at any time”  
  ↳ madde: 1. Account Cancellation It is your responsibility to properly cancel your Account with GitHub. You can cancel your Account at any time by going into your Settings in the global navigation bar at the t…
- [C157] `liability_limitation/medium` “as is”  
  ↳ madde: We provide our service as is, and we make no promises or guarantees about this service. Please read this section carefully; you should understand what to expect.
- [C160] `liability_limitation/high` “Limitation of Liability”  
  ↳ madde: P. Limitation of Liability Short version:
- [C161] `liability_limitation/high` “not be liable”  
  ↳ madde: We will not be liable for damages or losses arising from your use or inability to use the service or otherwise arising under this agreement. Please read this section carefully; it limits our obligatio…
- [C170] `indemnification/medium` “Indemnification”  
  ↳ madde: Q. Release and Indemnification Short version:

## netflix-tos

### ✅ Yakalanan (4/7)

- **NFX-02** `cancellation_refund` — Ödemeler iade edilmez; kısmi dönem için iade/kredi yok.  
  ↳ sistem: `auto_renewal/medium` [C029] “auto-renew”
- **NFX-03** `price_change` — Fiyat ve planlar değiştirilebilir (1 ay önceden bildirim).  
  ↳ sistem: `price_change/medium` [C030] “price changes”
- **NFX-04** `unilateral_changes` — Koşullar şirket tarafından değiştirilebilir.  
  ↳ sistem: `unilateral_changes/medium` [C038] “may, from time to time, change these Terms”
- **NFX-07** `governing_law` — Hollanda hukuku uygulanır (tüketici hakları saklı).  
  ↳ sistem: `governing_law/low` [C034] “governed by and construed in accordance with the laws of”

### ❌ Kaçırılan (3)

- **NFX-01** `auto_renewal/medium` — İptal edilmedikçe her dönem otomatik ücret çekilir.  
  ↳ çapa: “Unless you cancel your subscription before your billing date, you authorize us to charge the subscription fee for the next billing cycle”
- **NFX-05** `other/medium` — Birincil ödeme yöntemi reddedilirse hesaptaki diğer ödeme yöntemlerinden çekim yapılır.  
  ↳ çapa: “You authorize us to charge any Payment Method associated with your account in case your primary Payment Method is declined”
- **NFX-06** `account_termination/medium` — Dolandırıcılık şüphesiyle hesap kapatılabilir veya bekletilebilir.  
  ↳ çapa: “We can terminate your account or place your account on hold in order to protect you, Netflix or our partners from identity theft or other fraudulent activity.”

### ⚠️ Yanlış alarm (0)

- (yok)

## spotify-tos

### ✅ Yakalanan (16/19)

- **SPT-01** `dispute_resolution` — Uyuşmazlıklar mahkeme yerine bireysel bağlayıcı tahkimde çözülür.  
  ↳ sistem: `dispute_resolution/high` [C004] “ARBITRATION”
- **SPT-02** `dispute_resolution` — Toplu dava (class action) hakkından feragat.  
  ↳ sistem: `dispute_resolution/high` [C071] “arbitration”
- **SPT-03** `dispute_resolution` — Jüri yargılaması hakkından feragat.  
  ↳ sistem: `dispute_resolution/high` [C072] “waive any right to a jury”
- **SPT-04** `liability_limitation` — Toplam sorumluluk son 12 ayda ödenen tutar veya 30 $ ile sınırlı; dolaylı zararlar hariç.  
  ↳ sistem: `liability_limitation/high` [C063] “AGGREGATE LIABILITY”
- **SPT-05** `liability_limitation` — Tek çare uygulamayı silmek ve kullanmayı bırakmaktır.  
  ↳ sistem: `liability_limitation/high` [C062] “Limitation of liability”
- **SPT-06** `liability_limitation` — Hizmet "olduğu gibi" sunulur; garanti yok.  
  ↳ sistem: `liability_limitation/medium` [C061] “AS IS"”
- **SPT-07** `dispute_resolution` — Talepler 1 yıl içinde açılmazsa hak düşer.  
  ↳ sistem: `dispute_resolution/high` [C065] “ARBITRATION”
- **SPT-08** `content_license` — Kullanıcı içeriğine devredilebilir, alt lisanslanabilir, geri alınamaz, dünya çapında lisans; manevi haklardan feragat.  
  ↳ sistem: `content_license/high` [C047] “transferable, sublicensable, royalty-free, fully paid, irrevocable, worldwide license”
- **SPT-09** `indemnification` — Spotify'ın zararlarını ve avukatlık masraflarını kullanıcı karşılar.  
  ↳ sistem: `indemnification/medium` [C069] “Indemnification”
- **SPT-10** `unilateral_changes` — Değişiklikten sonra kullanmaya devam etmek kabul sayılır.  
  ↳ sistem: `unilateral_changes/medium` [C102] “may make changes to these Terms”
- **SPT-11** `price_change` — Fiyat değişebilir; kullanmaya devam etmek yeni fiyatı kabul sayılır.  
  ↳ sistem: `price_change/medium` [C028] “price changes”
- **SPT-13** `cancellation_refund` — Kısmi dönem için iade yok; fesihte ödenen tutar iade edilmez.  
  ↳ sistem: `cancellation_refund/high` [C032] “do not provide refunds”
- **SPT-14** `account_termination` — İhlal şüphesiyle her an askı/fesih; sorumluluk ve iade yok.  
  ↳ sistem: `account_termination/high` [C058] “suspend your access to the Spotify Service at any time”
- **SPT-15** `account_termination` — Spotify ücretli aboneliği 14 gün bildirimle her an sonlandırabilir.  
  ↳ sistem: `account_termination/high` [C034] “terminate a Paid Subscription at any time”
- **SPT-18** `tracking_advertising` — Cihaz kaynakları kullanılır; size ve iş ortaklarına reklam gösterme hakkı verilir. ⚠️ kategori farklı  
  ↳ sistem: `data_sharing/medium` [C049] “provide advertising and other information to you, and (3) to allow our business partners”
- **SPT-19** `governing_law` — New York hukuku ve New York mahkemeleri yetkili.  
  ↳ sistem: `dispute_resolution/high` [C070] “class action”

### ❌ Kaçırılan (3)

- **SPT-12** `auto_renewal/medium` — Ücretli abonelik iptal edilene kadar süresiz devam eder ve otomatik çekilir.  
  ↳ çapa: “Paid Subscriptions continue indefinitely until cancelled”
- **SPT-16** `unilateral_changes/medium` — Hizmet ve içerik bildirimsiz ve sorumluluksuz değiştirilebilir/kaldırılabilir.  
  ↳ çapa: “Spotify reserves the right to change our Spotify Service offerings and their availability from time to time, without notice or liability to you”
- **SPT-17** `other/medium` — Kullanıcı içeriği herhangi bir sebeple ya da sebepsiz kaldırılabilir.  
  ↳ çapa: “Spotify reserves the right to remove or disable access to any User Content for any or no reason.”

### ⚠️ Yanlış alarm (14)

- [C076] `dispute_resolution/high` “arbitration”  
  ↳ madde: Exceptions to arbitration You and Spotify both agree that any Dispute relating to any actual or alleged infringement of your or Spotify's intellectual property rights shall be brought in the federal c…
- [C079] `dispute_resolution/high` “arbitration”  
  ↳ madde: After a Notice containing all of the information required above is received, the parties agree to engage in good faith for a period of sixty (60) days in an effort to resolve the Dispute (this time pe…
- [C082] `dispute_resolution/high` “arbitration”  
  ↳ madde: Neither you nor Spotify may commence an arbitration proceeding until after the Tolling Period has ended.
- [C084] `dispute_resolution/high` “arbitration”  
  ↳ madde: If NAM is unavailable, unwilling, or otherwise unable to administer an arbitration in accordance with this Arbitration Agreement, then another administrator that will do so will be selected by agreeme…
- [C085] `dispute_resolution/high` “arbitration”  
  ↳ madde: Each party retains the right to request a hearing in arbitration from the arbitrator. Any arbitration hearings will be conducted by phone or videoconference to the extent possible, but if the arbitrat…
- [C086] `dispute_resolution/high` “arbitration”  
  ↳ madde: As in court, any counsel participating in an arbitration certifies that they are complying with the requirements of Federal Rule of Civil Procedure 11(b), including a certification that the claim or t…
- [C088] `dispute_resolution/high` “arbitration”  
  ↳ madde: Regardless of the manner in which the arbitration is conducted, the arbitrator shall issue a reasoned written decision sufficient to explain the essential findings and conclusions on which the decisio…
- [C089] `dispute_resolution/high` “arbitration”  
  ↳ madde: Mass arbitration If you elect to have your claim addressed as part of a mass arbitration (defined below), you agree to the additional procedures set forth below.
- [C091] `dispute_resolution/high` “arbitration”  
  ↳ madde: These mass filing procedures are intended to facilitate the efficient and orderly resolution and settlement of mass arbitrations. If any aspect of this "Mass arbitration" section has not been met, the…
- [C092] `dispute_resolution/high` “arbitration”  
  ↳ madde: If these mass filing procedures apply to your case, the Tolling Period for your claims will be extended until your case is selected to proceed as part of a staged proceeding, withdrawn, opted out of a…
- [C093] `dispute_resolution/high` “arbitration”  
  ↳ madde: First Stage: In the first stage, counsel for the parties shall each select twenty-five (25) cases per side (50 cases total) to be filed in arbitration and to proceed individually in accordance with th…
- [C097] `dispute_resolution/high` “arbitration”  
  ↳ madde: OR Option Two: If neither you nor Spotify elects to have your case heard in court consistent with Option One, then you agree that your case will be resolved through continuing staged proceedings as se…
- [C098] `dispute_resolution/high` “arbitrator”  
  ↳ madde: Throughout the staged process above, the arbitrators for the cases are encouraged to resolve the cases within one hundred twenty (120) days of appointment or as swiftly as possible thereafter, consist…
- [C099] `dispute_resolution/high` “arbitration”  
  ↳ madde: A court of competent jurisdiction will have the authority to enforce this "Mass arbitration" section and, if necessary, to enjoin the filing or prosecution of arbitrations or the assessment or collect…

## tiktok-tos

### ✅ Yakalanan (4/7)

- **TT-01** `content_license` — İçeriğinize TikTok ve iştiraklerine devredilebilir, alt lisanslanabilir, dünya çapında, ücretsiz lisans verirsiniz.  
  ↳ sistem: `content_license/high` [C101] “license your content to others), royalty-free”
- **TT-02** `content_license` — Tüm kullanıcılara içeriğinizi kopyalama/uyarlama lisansı verirsiniz.  
  ↳ sistem: `content_license/high` [C103] “royalty-free, worldwide licence”
- **TT-03** `data_retention` — İçeriği silseniz bile lisans ve başkalarının kopyaları devam edebilir. ⚠️ kategori farklı  
  ↳ sistem: `data_sharing/medium` [C090] “shared your content on third party services, your content may stay on the third part”
- **TT-05** `unilateral_changes` — Koşullar ve platform değiştirilebilir; kabul etmezseniz kullanmayı bırakmanız gerekir.  
  ↳ sistem: `unilateral_changes/medium` [C134] “may make changes to these Terms”

### ❌ Kaçırılan (3)

- **TT-04** `account_termination/medium` — Hesap askıya alınabilir/kapatılabilir; özel durumlarda önceden bildirim yapılmayabilir.  
  ↳ çapa: “Suspension or termination may happen without prior notice if special circumstances”
- **TT-06** `liability_limitation/medium` — Belirli zararlar için sorumluluk kabul edilmez.  
  ↳ çapa: “we do not take responsibility for loss or damage caused by us, unless it is:”
- **TT-07** `other/low` — 6 ay giriş yapılmazsa kullanıcı adı geri alınıp başkasına verilebilir.  
  ↳ çapa: “We may reclaim your account name if you have not logged into your account for 6 months”

### ⚠️ Yanlış alarm (3)

- [C042] `data_sharing/medium` “disclose it to any third part”  
  ↳ madde: It is important that you take reasonable steps to keep your account password secure and do not disclose it to any third party. If you know or suspect that any third party knows your password or has ac…
- [C146] `unilateral_changes/medium` “can make changes to these Terms”  
  ↳ madde: In short: We can make changes to these Terms or the Platform for a limited number of reasons.
- [C148] `governing_law/low` “governed by the law of”  
  ↳ madde: If you are a consumer, these Terms are governed by the law of the jurisdiction in which you live.
