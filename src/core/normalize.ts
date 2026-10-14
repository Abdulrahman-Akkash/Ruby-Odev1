/**
 * Alıntı eşleştirmesi için metin normalizasyonu. Hem kaynak metne hem de LLM'in
 * verdiği alıntıya AYNI dönüşüm uygulanır; böylece yalnızca tipografik farklar
 * (akıllı tırnak, tire, boşluk, büyük/küçük harf) tolere edilir — kelime değişikliği edilmez.
 */
export function normalizeForMatch(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[­​-‍⁠﻿]/g, '') // görünmez karakterler
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1') // markdown kaçışları
    .replace(/\s+/g, ' ')
    .replace(/\s*(["()\[\]])\s*/g, '$1') // tırnak/parantez çevresindeki boşluk farkları (satır içi <strong> vb.)
    .trim()
    .toLocaleLowerCase('en-US')
}

/** Alıntıyı "..." / "…" noktalarından parçalara ayırır (her parça ayrı doğrulanır). */
export function splitQuoteParts(quote: string): string[] {
  return quote
    .split(/\s*(?:\.\.\.|…|\[\.\.\.\]|\[…\])\s*/)
    .map((p) => normalizeForMatch(p))
    .filter((p) => p.length > 0)
}

/** "..." ile birleştirilen iki parça arasında izin verilen en fazla karakter. */
export const MAX_ELLIPSIS_GAP = 250
export const MAX_QUOTE_PARTS = 4

/**
 * `parts` sırayla `haystack` içinde geçiyor mu? Geçiyorsa ilk parçanın konumunu döner.
 * Parçalar arası boşluk MAX_ELLIPSIS_GAP'i aşamaz: aksi hâlde birbirinden uzak
 * kelimeler "..." ile yapıştırılarak metinde olmayan bir anlam kurulabilirdi
 * (ör. "we will not ... sell your data").
 */
export function findOrderedParts(haystack: string, parts: string[], maxGap = MAX_ELLIPSIS_GAP): number {
  if (parts.length === 0 || parts.length > MAX_QUOTE_PARTS) return -1
  const matchFrom = (k: number, from: number, limit: number): boolean => {
    if (k === parts.length) return true
    let idx = haystack.indexOf(parts[k], from)
    while (idx >= 0 && idx - from <= limit) {
      if (matchFrom(k + 1, idx + parts[k].length, maxGap)) return true
      idx = haystack.indexOf(parts[k], idx + 1)
    }
    return false
  }
  let start = haystack.indexOf(parts[0])
  while (start >= 0) {
    if (matchFrom(1, start + parts[0].length, maxGap)) return start
    start = haystack.indexOf(parts[0], start + 1)
  }
  return -1
}
