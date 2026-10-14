/**
 * Deterministik madde (clause) bölütleme. Aynı metin her zaman aynı ID'leri üretir;
 * LLM bu ID'lere atıf yapar, doğrulayıcı da alıntıyı bu bölütlerde arar.
 */

export interface Clause {
  id: string
  text: string
}

const MAX_CLAUSE_CHARS = 1400
const HEADING_MAX_CHARS = 80

function isHeadingLike(line: string): boolean {
  if (line.length > HEADING_MAX_CHARS) return false
  if (/[.;:!?]["')\]]?$/.test(line) && !/^\d+(\.\d+)*\.?$/.test(line)) return false
  return true
}

function splitLongParagraph(text: string): string[] {
  if (text.length <= MAX_CLAUSE_CHARS) return [text]
  // Cümle sınırları: nokta/ünlem/soru + boşluk + büyük harf ya da rakam/tırnak/parantez.
  const sentences = text.split(/(?<=[.!?;])\s+(?=[A-ZÇĞİÖŞÜ0-9"“(])/u)
  const out: string[] = []
  let buf = ''
  for (const s of sentences) {
    if (buf && buf.length + s.length + 1 > MAX_CLAUSE_CHARS) {
      out.push(buf)
      buf = s
    } else {
      buf = buf ? `${buf} ${s}` : s
    }
  }
  if (buf) out.push(buf)
  // Tek bir dev cümle varsa yine de sınırla (kelime sınırında böl).
  return out.flatMap((chunk) => {
    if (chunk.length <= MAX_CLAUSE_CHARS * 1.5) return [chunk]
    const parts: string[] = []
    let rest = chunk
    while (rest.length > MAX_CLAUSE_CHARS) {
      let cut = rest.lastIndexOf(' ', MAX_CLAUSE_CHARS)
      if (cut < MAX_CLAUSE_CHARS / 2) cut = MAX_CLAUSE_CHARS
      parts.push(rest.slice(0, cut))
      rest = rest.slice(cut).trimStart()
    }
    if (rest) parts.push(rest)
    return parts
  })
}

export function segmentText(text: string): Clause[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0 && /[\p{L}\p{N}]/u.test(l))

  const paragraphs: string[] = []
  let pendingHeading = ''
  for (const line of lines) {
    if (isHeadingLike(line)) {
      pendingHeading = pendingHeading ? `${pendingHeading} ${line}` : line
      if (pendingHeading.length > MAX_CLAUSE_CHARS / 2) {
        paragraphs.push(pendingHeading)
        pendingHeading = ''
      }
      continue
    }
    paragraphs.push(pendingHeading ? `${pendingHeading} ${line}` : line)
    pendingHeading = ''
  }
  if (pendingHeading) paragraphs.push(pendingHeading)

  const pieces = paragraphs.flatMap(splitLongParagraph)
  const width = Math.max(3, String(pieces.length).length)
  return pieces.map((t, i) => ({ id: `C${String(i + 1).padStart(width, '0')}`, text: t }))
}

/** Bölütleri LLM'e gönderilecek parçalara (chunk) ayırır. */
export function chunkClauses(clauses: Clause[], maxChars: number): Clause[][] {
  const chunks: Clause[][] = []
  let cur: Clause[] = []
  let size = 0
  for (const c of clauses) {
    const len = c.text.length + c.id.length + 4
    if (cur.length && size + len > maxChars) {
      chunks.push(cur)
      cur = []
      size = 0
    }
    cur.push(c)
    size += len
  }
  if (cur.length) chunks.push(cur)
  return chunks
}
