# Sunum akışı (5 dakika, canlı URL üzerinden)

**Hazırlık (sunumdan ~5 dk önce):**
1. Canlı URL'yi aç: https://asist-dj8n.onrender.com (ücretsiz plan uyuyorsa ilk istek ~1 dk sürer).
2. `ayse@asist.dev` / `asist2026` ile giriş → **Ekip → Demo verisini sıfırla** → tekrar giriş.
3. En az 2 dk bekle; **Kuyruk → Çözülen / kapanan** sekmesinde *"API anahtarı nasıl yenilenir?"* talebi **Kapandı** görünmeli
   (4 gün kuralı sıfırlamadan 2 dk sonra kendiliğinden işler — zaman kuralının canlı kanıtı).
4. İkinci sekmede müşteri formunu (`/`) aç.

## 1. Hangi SaaS, hangi dilim, kim neden ödüyor? (30 sn)
"İlham kaynağım Zendesk Support. Uber ve Stanley Black & Decker gibi Fortune 500 firmaları, destek ekiplerinin
'hiçbir müşteri söz verilen süreden fazla beklemesin' — yani SLA — sözünü tutabilmesi için para ödüyor.
Aort dilimi: talep gelir, atanır, yanıtlanır, çözülür, kapanır; hepsi bir SLA saatine karşı."

## 2. Canlı akış (2 dk)
1. **Müşteri sekmesi:** ad, e-posta, konu "Sunum testi", Aciliyet *Yüksek* → **Talebi gönder**. Gizli talep sayfası açılır, "Söz verdiğimiz ilk yanıt zamanı" görünür.
2. **Ajan sekmesi → Kuyruk → Sahipsiz:** yeni talep, SLA rozeti "3 sa 59 dk kaldı".
3. Talebi aç → **Bana ata** → durum *Yeni → Açık* (sağdaki **Geçmiş**'te görünür).
4. Yanıt yaz, "Gönder ve durumu: **Beklemede**" → müşteri sekmesini yenile, yanıt orada → müşteri yanıt yazsın → ajan tarafında talep yeniden **Açık**.
5. Yanıtı "**Çözüldü**" olarak gönder → müşteri sayfasında "Yanıt vermezseniz talep … tarihinde kapanır" yazar.
6. **Çözülen / kapanan** → *"API anahtarı nasıl yenilenir?"* → Geçmiş: "Çözüldü → Kapandı (4 gün içinde yeniden açılmadı)", yapan **Asist (sistem)**.

## 3. Kod (1 dk)
- **Zaman kuralı:** [`app/models/sla_policy.rb:6-28`](../app/models/sla_policy.rb#L6) (hedefler, `first_reply_due_at`, `warning_at`) →
  [`app/models/ticket.rb:144-156`](../app/models/ticket.rb#L144) `sla_state` →
  [`ticket.rb:35`](../app/models/ticket.rb#L35) `AUTO_CLOSE_AFTER` + [`ticket.rb:201-205`](../app/models/ticket.rb#L201) `close_stale_solved!`.
  Kim çalıştırır: [`app/models/sweeper.rb:19-32`](../app/models/sweeper.rb#L19).
- **Durum geçişi:** [`ticket.rb:22-28`](../app/models/ticket.rb#L22) `TRANSITIONS` tablosu + [`ticket.rb:67-87`](../app/models/ticket.rb#L67) `transition_to!`.
- **Testler (`travel_to`):**
  [`test/models/ticket_sla_test.rb:14`](../test/models/ticket_sla_test.rb#L14) (5:59'da riskli değil, 6:00'da riskli, 8:00:01'de ihlal),
  [`ticket_sla_test.rb:80`](../test/models/ticket_sla_test.rb#L80) (4 gün − 1 dk kapanmaz, 4. günde kapanır),
  [`test/models/ticket_status_test.rb:33`](../test/models/ticket_status_test.rb#L33) (her geçişin zaman damgası),
  [`test/integration/aort_flow_test.rb:5`](../test/integration/aort_flow_test.rb#L5) (uçtan uca HTTP + 4 gün).

## 4. Çözdüğüm acı (1 dk)
Tek cümle: README → **Kullanıcı acısı ve çözümü** bölümündeki "Tek cümle".

Canlı gösterim (Ayşe olarak):
1. Kuyruğun üstündeki **SLA hatırlatma** bandı (Ayşe'nin riskli talebi, "… kaldı" / "… gecikti").
2. **Pas akışı**: demo sıfırlanınca Zeynep'in (vardiya dışı) talebi Ayşe'ye, sahipsiz acil talep Mehmet'e kendiliğinden pas edilmiş — sebebiyle.
3. **Vardiyayı bitir** → bildirim: "N talebin vardiyadaki ekip arkadaşlarına pas edildi"; Pas akışında Ayşe'nin açık talepleri Mehmet'e geçmiş.

Soru-cevap için (zaman alır, isteğe bağlı): **Vardiyaya başla → "2 dakika (demo)"** → **Sahipsiz** sekmesinden bir talebi aç →
**Bana ata** → kuyrukta bekle; 2 dk sonra (sayfa 30 sn'de bir yenilenir) talep kimse dokunmadan Mehmet'e pas edilir.
*Not:* "Beklemede" talepler bilerek sahibinde kalır (müşteriden yanıt bekleniyor); müşteri yazınca anında pas edilir.

Olası itiraz — *"Zendesk bunu zaten yapmıyor mu?"*: README → **Zendesk bugün ne yapıyor, Asist'in farkı** paragrafı.

## 5. Kod yeri sorusu (30 sn) — hazır cevaplar
Tam liste README → **Kod haritası** (17 satır, yan etkileriyle). En olası sorular:

| Soru | Cevap |
|---|---|
| SLA hafta sonunu saymasın | [`sla_policy.rb:21-23`](../app/models/sla_policy.rb#L21) `first_reply_due_at` **ve** [`sla_policy.rb:26-28`](../app/models/sla_policy.rb#L26) `warning_at` — ikisi de iş takvimiyle sarılır |
| Acil SLA 30 dk olsun | [`sla_policy.rb:7`](../app/models/sla_policy.rb#L7) `"urgent" => 1.hour` |
| `pending`'de SLA dursun | [`ticket.rb:147`](../app/models/ticket.rb#L147) `sla_state` + [`ticket.rb:59`](../app/models/ticket.rb#L59) / [`ticket.rb:192`](../app/models/ticket.rb#L192) sorgular |
| Çözülen talep 7 günde kapansın | [`ticket.rb:35`](../app/models/ticket.rb#L35) `AUTO_CLOSE_AFTER` |
| Beklemedeki talep doğrudan kapanabilsin | [`ticket.rb:25`](../app/models/ticket.rb#L25) `"pending"` satırına `closed` |
| Müşteri yanıtı çözülmüş talebi açmasın | [`ticket.rb:124`](../app/models/ticket.rb#L124) |
| Yeni talep 15 dk'da atanmazsa pas | [`auto_pass.rb:43`](../app/models/auto_pass.rb#L43) kural 2 |
| Pas sırayla (round robin) dağıtılsın | [`auto_pass.rb:61-63`](../app/models/auto_pass.rb#L61) `pick_receiver` |
