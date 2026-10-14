# Eval etiketleme yönergesi

## Korpus

| Belge | Tür | Kaynak | Çıkarılmış metin | Madde (bölüt) |
|---|---|---|---|---|
| `netflix-tos` | abonelik koşulları | Open Terms Archive (contrib-versions) | 18 966 karakter | 41 |
| `spotify-tos` | abonelik koşulları (ABD, tahkimli) | Open Terms Archive (contrib-versions) | 54 781 karakter | 108 |
| `tiktok-tos` | kullanım koşulları (AB/BK sürümü) | Open Terms Archive (pga-versions) | 28 502 karakter | 160 |
| `github-tos` | kullanım koşulları | github/site-policy (resmi depo) | 45 151 karakter | 183 |
| `basecamp-tos` | SaaS abonelik koşulları | basecamp/policies (resmi depo) | 16 966 karakter | 57 |
| `basecamp-privacy` | gizlilik politikası | basecamp/policies (resmi depo) | 21 440 karakter | 76 |

Ham metinler `eval/corpus/*.md` (kaynak URL ve tarih `sources.json` içinde). Metinler
`harness/fixtures/*.html` sayfalarına çevrilir ve **uzantının kendi page-agent çıkarıcısıyla**
gerçek Chromium'da okunur (`eval/extract.ts` → `eval/extracted/*.json`). Yani eval, kullanıcının
gördüğü metni değil, sistemin LLM'e gönderdiği metni ölçer.

## Altın etiket (gold) ne demek?

`eval/gold/<belge>.json`:

- **items** — bir tüketicinin bilmesi gereken, kullanıcı aleyhine sonuç doğurabilecek *konular*.
  Her konunun bir kategorisi, şiddeti, Türkçe açıklaması ve bir ya da birkaç **çapa alıntısı**
  (`anchors`) vardır. Aynı konu metinde birden çok yerde geçiyorsa (ör. Spotify'da toplu dava
  feragati hem başta hem tahkim bölümünde) her yer ayrı çapa olarak eklenir.
- **acceptable** — işaretlenmesi savunulabilir ama zorunlu olmayan sınır maddeler (ör. "beta
  özellikleri kendi riskinizde"). Bu maddelere düşen bulgular **nötr** sayılır: ne doğru ne yanlış alarm.

Kriter: ToS;DR tarzı "kullanıcı için kötü" noktalar — iade yokluğu, otomatik yenileme, tek taraflı
değişiklik, sebepsiz fesih, sorumluluk sınırlaması, tahkim/toplu dava feragati, geniş içerik
lisansı, tazmin, veri paylaşımı/saklama, izleme/reklam, yabancı yetkili hukuk. Standart
kullanım yasakları (spam yapmayın, tersine mühendislik yapmayın) risk sayılmaz.

Her çapanın çıkarılmış metinde birebir geçtiği `npm run eval:check-gold` ile doğrulanır.

## Eşleştirme

- Eşleştirme **madde (bölüt) düzeyinde**dir: bir bulgu, bir altın konunun çapalarından birinin
  geçtiği maddeye düşerse o konu **yakalandı** sayılır (kategori farklı olsa bile; kategori
  uyumu ayrıca "Recall (kategori dahil)" sütununda raporlanır).
- Hiçbir altın konuya ve kabul edilebilir maddeye düşmeyen bulgu **yanlış alarm**dır.
- `Precision = doğru bulgular / (doğru + yanlış alarm)` (nötrler hariç),
  `Recall = yakalanan konu / altın konu`.

## Sınırlamalar (dürüstçe)

- Etiketler bu depo hazırlanırken **tek bir etiketleyici** tarafından (yapay zekâ destekli) oluşturuldu;
  etiketleyiciler arası uyum ölçülmedi. Teslim öncesi ekipten en az bir kişinin gözden geçirmesi önerilir.
- Kural taban çizgisi (`src/core/rules.ts`) altın etiketler yazılmadan **önce** yazıldı ve
  etiketlere göre ayarlanmadı; buna rağmen aynı kişi tarafından yazıldığı için tamamen kör sayılmaz.
- 6 belge küçük bir örneklem; sonuçlar yön göstericidir, istatistiksel genelleme değildir.
- Belgelerin 5'i İngilizce, Türkçe metin yalnızca el yapımı test sayfalarında var.
