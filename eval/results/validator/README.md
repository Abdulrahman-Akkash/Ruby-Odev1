# Alıntı doğrulayıcı eval

Üretim: `npx tsx eval/validator-eval.ts` · 2026-10-14 · kaynak: 6 belgedeki tüm altın çapalar

| Varyant | Beklenen | Doğru karar | Oran |
|---|---|---|---|
| birebir | kabul | 101/101 | 100% |
| tipografi (tırnak/harf/boşluk) | kabul | 101/101 | 100% |
| yanlış madde ID (düzeltilmeli) | kabul | 101/101 | 100% |
| "..." ile kısaltma | kabul | 82/82 | 100% |
| "..." parçaları ters sırada | ret | 78/78 | 100% |
| olumsuzluk çevrildi | ret | 47/47 | 100% |
| tek kelime değişti | ret | 92/92 | 100% |
| başka belgeden alıntı | ret | 101/101 | 100% |
| çok kısa (<20 karakter) | ret | 101/101 | 100% |
| uzak parçaları "..." ile yapıştırma | ret | 28/28 | 100% |

**Sınırlama:** doğrulayıcı alıntının metinde *geçtiğini* kanıtlar; alıntının *doğru yorumlandığını* (kategori/şiddet/açıklama) kanıtlamaz. Bu kısım LLM eval'inde ölçülür.
