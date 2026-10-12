# Sunum akışı (5 dakika)

**Hazırlık (sunumdan 5 dk önce):** canlı URL'yi aç (ücretsiz plan uyuyorsa uyanması ~1 dk) →
`ayse@asist.dev` / `asist2026` ile giriş → **Ekip → Demo verisini sıfırla** → tekrar giriş yap.
İkinci sekmede müşteri formunu (`/`) aç.

## 1. Hangi SaaS, hangi dilim, kim neden ödüyor? (30 sn)
"İlham kaynağım Zendesk Support. Uber ve Stanley Black & Decker gibi Fortune 500 firmaları, destek ekiplerinin
'hiçbir müşteri söz verilen süreden fazla beklemesin' — yani SLA — sözünü tutabilmesi için para ödüyor.
Aort dilimi: talep gelir, atanır, yanıtlanır, çözülür, kapanır."

## 2. Canlı akış (2 dk)
1. **Müşteri sekmesi:** form → Konu "Sunum testi", Aciliyet *Yüksek* → gönder. Gizli talep sayfası açılır, "ilk yanıt zamanı" görünür.
2. **Ajan sekmesi → Kuyruk → Sahipsiz:** yeni talep, SLA rozeti "3 sa 59 dk kaldı".
3. Talebi aç → **Bana ata** → durum *Yeni → Açık* (geçmişte görünür).
4. Yanıt yaz, "Gönder ve durumu: **Beklemede**" → müşteri sekmesini yenile, yanıt orada; müşteri yanıt yazsın → ajan tarafında talep yeniden **Açık**.
5. Yanıtı "**Çözüldü**" olarak gönder → müşteri sayfasında "… tarihinde kapanır" yazar.
6. **Çözülen / kapanan** sekmesinde demo talebi *"API anahtarı nasıl yenilenir?"* — demo sıfırlamasından ~2 dk sonra **kendiliğinden Kapandı** olur (4 gün kuralı).

## 3. Kod (1 dk)
- **Zaman kuralı:** `app/models/sla_policy.rb` (hedefler, `first_reply_due_at`) + `app/models/ticket.rb` → `sla_state`, `AUTO_CLOSE_AFTER`, `close_stale_solved!`.
- **Durum geçişi:** `app/models/ticket.rb` → `TRANSITIONS` tablosu ve `transition_to!`.
- **Testleri:** `test/models/ticket_sla_test.rb` ("5:59'da riskli değil, 6:00'da riskli" — `travel_to`) ve `test/models/ticket_status_test.rb`.

## 4. Çözdüğüm acı (1 dk)
Tek cümle: *"Zendesk kullanan destek ekibi liderinin G2 yorumundaki 'vardiyada olmayan ajanın taleplerini otomatik yeniden atayan
ve SLA'yı hatırlatan özellik yok' acısını, vardiyası biten ajanın ve SLA'sı riske giren sahipsiz talepleri dakikalar içinde
vardiyadaki en az yüklü ajana otomatik pas eden 'Otomatik Pas' ile çözdüm."*

Canlı gösterim:
1. Kuyruğun üstündeki **SLA hatırlatma** bandı (Ayşe'nin riskli talebi).
2. **Pas akışı** sayfası: demo sıfırlanınca Zeynep (vardiya dışı) talebi Ayşe'ye, sahipsiz acil talep Mehmet'e pas edilmiş.
3. Ayşe → **Vardiyayı bitir** → Pas akışında Ayşe'nin açık talepleri Mehmet'e geçti.
4. (İsteğe bağlı) **Vardiyaya başla → "2 dakika (demo)"**: 2 dk sonra talepler kimse dokunmadan pas edilir.

## 5. Kod yeri sorusu (30 sn) — hazır cevaplar
README → **Kod haritası** tablosu. En olası sorular:

| Soru | Cevap |
|---|---|
| SLA hafta sonunu saymasın | `app/models/sla_policy.rb:21-22` — `first_reply_due_at` içinde `from + target` yerine iş saatine göre ileri sar. |
| Acil SLA 30 dk olsun | `app/models/sla_policy.rb:6` — `FIRST_REPLY_TARGETS["urgent"]` |
| Çözülen talep 7 günde kapansın | `app/models/ticket.rb:35` — `AUTO_CLOSE_AFTER` |
| Beklemedeki talep doğrudan kapanabilsin | `app/models/ticket.rb:22` — `TRANSITIONS["pending"]`'e `closed` ekle |
| Pas sırayla dağıtılsın | `app/models/auto_pass.rb:59` — `pick_receiver` |
