/**
 * page-agent PageController'ın "simplified HTML" çıktısını düz paragraf metnine çevirir.
 *
 * page-agent her metin düğümünü ayrı satıra yazar ve etkileşimli öğeleri
 * `[3]<a >refund policy />` biçiminde işaretler. Bu yüzden satır içi bir bağlantı
 * cümleyi üç satıra böler. Burada satırlar yeniden cümlelere birleştirilir,
 * böylece LLM'in alıntıları ve doğrulayıcı aynı metni görür.
 */

export interface PageLine {
  text: string
  interactiveTag: string | null
}

const INTERACTIVE_RE = /^\t*\*?\[\d+\]<([a-zA-Z0-9-]+)(?:\s[^>]*)?>([\s\S]*?)\s?\/>\s*$/

export function simplifiedToLines(simplified: string): PageLine[] {
  const out: PageLine[] = []
  // Çok satırlı etkileşimli öğeleri tek satıra indir.
  const flattened = simplified.replace(/\*?\[\d+\]<[a-zA-Z0-9-]+(?:\s[^>\n]*)?>[\s\S]*?\s?\/>/g, (m) => m.replace(/\n+/g, ' '))
  for (const rawLine of flattened.split('\n')) {
    const m = INTERACTIVE_RE.exec(rawLine)
    if (m) {
      const text = m[2].replace(/\s+/g, ' ').trim()
      if (text) out.push({ text, interactiveTag: m[1].toLowerCase() })
      continue
    }
    const text = rawLine.replace(/\s+/g, ' ').trim()
    if (text) out.push({ text, interactiveTag: null })
  }
  return out
}

const STARTS_INLINE = /^[a-zçğıöşü,.;:)\]%'’”"]/u
const ENDS_OPEN = /[,(\-–—:"“‘'\[]$|\b(the|a|an|our|your|of|to|and|or|in|on|for|with|by|see|at|from|bu|ve|veya|ile|için)$/iu
const TERMINAL = /[.!?;:]["'’”)\]]?$/

/** Satır içi öğe sınırında boşluk gerekip gerekmediğini tahmin eder: `("` + `Terms` + `")` → `("Terms")`. */
function joinSeparator(prev: string, next: string): string {
  if (/[(\[“‘]$/.test(prev) || /(^|[\s(])["']$/.test(prev)) return ''
  if (/^[,.;:)\]”’%]/.test(next)) return ''
  if (/^["']/.test(next) && (prev.match(/"/g)?.length ?? 0) % 2 === 1) return ''
  return ' '
}

export function assembleParagraphs(lines: PageLine[]): string {
  const paras: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prev = paras.length ? paras[paras.length - 1] : null
    const next = lines[i + 1]
    const joinWithPrev =
      prev !== null &&
      !TERMINAL.test(prev) &&
      (STARTS_INLINE.test(line.text) || ENDS_OPEN.test(prev) || (line.interactiveTag === 'a' && !!next && STARTS_INLINE.test(next.text)))
    if (joinWithPrev) {
      paras[paras.length - 1] = `${prev}${joinSeparator(prev, line.text)}${line.text}`
      continue
    }
    // Paragraf içinde olmayan kısa bağlantı/düğme satırları (menü, altbilgi) atılır.
    if (line.interactiveTag && /^(a|button|summary|select|input)$/.test(line.interactiveTag) && line.text.length < 60) {
      const inlineAhead = !!next && STARTS_INLINE.test(next.text) && prev !== null && !TERMINAL.test(prev)
      if (!inlineAhead) continue
    }
    paras.push(line.text)
  }
  return paras.join('\n')
}

/** Gizli metin listesindeki satırları görünür metinden çıkarır (birebir eşleşme). */
export function removeLines(lines: PageLine[], hidden: Set<string>): PageLine[] {
  if (hidden.size === 0) return lines
  return lines.filter((l) => !hidden.has(l.text))
}
