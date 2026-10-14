/**
 * Alıntı doğrulayıcısının (validate.ts) kendisini ölçer — LLM gerekmez.
 * Altın etiket çapalarından (gerçek, birebir alıntılar) kabul edilmesi ve
 * reddedilmesi gereken varyantlar üretilir:
 *
 *  kabul edilmeli: birebir · tipografik fark (akıllı tırnak, BÜYÜK harf, fazla boşluk)
 *                  · yanlış madde ID'si (düzeltilmeli) · "..." ile kısaltma
 *  reddedilmeli:   olumsuzluk çevirme (not ekle/çıkar) · kelime değiştirme (may→will)
 *                  · başka belgeden alıntı · çok kısa alıntı · sıra değiştirilmiş "..." parçaları
 *
 *   npx tsx eval/validator-eval.ts
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { segmentText } from '../src/core/segment'
import { buildClauseIndex, verifyQuote } from '../src/core/validate'
import { findOrderedParts, splitQuoteParts } from '../src/core/normalize'

interface Variant {
  kind: string
  expect: 'accept' | 'reject'
  quote: string
  cite: (real: string) => string
}

function variants(anchor: string, foreign: string): Variant[] {
  const v: Variant[] = [
    { kind: 'birebir', expect: 'accept', quote: anchor, cite: (c) => c },
    { kind: 'tipografi (tırnak/harf/boşluk)', expect: 'accept', quote: anchor.replace(/'/g, '’').replace(/"/g, '“').replace(/ /g, '  ').toUpperCase(), cite: (c) => c },
    { kind: 'yanlış madde ID (düzeltilmeli)', expect: 'accept', quote: anchor, cite: () => 'C001' },
  ]
  const words = anchor.split(' ')
  if (words.length >= 12) {
    v.push({ kind: '"..." ile kısaltma', expect: 'accept', quote: `${words.slice(0, 4).join(' ')} ... ${words.slice(-4).join(' ')}`, cite: (c) => c })
    v.push({ kind: '"..." parçaları ters sırada', expect: 'reject', quote: `${words.slice(-4).join(' ')} ... ${words.slice(0, 4).join(' ')}`, cite: (c) => c })

  }
  const neg = / not /i.test(anchor) ? anchor.replace(/ not /i, ' ') : / (may|will|can|shall) /i.test(anchor) ? anchor.replace(/ (may|will|can|shall) /i, ' $1 not ') : null
  if (neg) v.push({ kind: 'olumsuzluk çevrildi', expect: 'reject', quote: neg, cite: (c) => c })
  const swaps: [RegExp, string][] = [[/\bmay\b/i, 'will'], [/\bany\b/i, 'some'], [/\ball\b/i, 'certain'], [/\byour\b/i, 'their'], [/\bwe\b/i, 'they'], [/\bthe\b/i, 'a']]
  for (const [re, rep] of swaps) {
    if (re.test(anchor)) {
      v.push({ kind: 'tek kelime değişti', expect: 'reject', quote: anchor.replace(re, rep), cite: (c) => c })
      break
    }
  }
  v.push({ kind: 'başka belgeden alıntı', expect: 'reject', quote: foreign, cite: (c) => c })
  v.push({ kind: 'çok kısa (<20 karakter)', expect: 'reject', quote: anchor.slice(0, 15), cite: (c) => c })
  return v
}

const goldFiles = (await readdir('eval/gold')).filter((f) => f.endsWith('.json')).sort()
const golds = await Promise.all(goldFiles.map(async (f) => JSON.parse(await readFile(`eval/gold/${f}`, 'utf8'))))
const stats = new Map<string, { expect: string; ok: number; n: number; fails: string[] }>()

for (const [gi, gold] of golds.entries()) {
  const doc = JSON.parse(await readFile(`eval/extracted/${gold.doc}.json`, 'utf8'))
  const index = buildClauseIndex(segmentText(doc.text))
  const wholeNorm = [...index.byId.values()].map((c) => c.norm).join(' ')
  const other = golds[(gi + 1) % golds.length]
  const anchors: string[] = gold.items.flatMap((i: { anchors: string[] }) => i.anchors)
  anchors.forEach((anchor, ai) => {
    const real = verifyQuote(index, '', anchor)
    if (!real.ok) throw new Error(`çapa bulunamadı: ${anchor}`)
    const foreignAnchors: string[] = other.items.flatMap((i: { anchors: string[] }) => i.anchors)
    const foreign = foreignAnchors[ai % foreignAnchors.length]
    const vs = variants(anchor, foreign)
    // Aynı maddeden ama birbirinden çok uzak iki parçanın "..." ile yapıştırılması (anlam kurgulama)
    const clauseText = index.byId.get(real.clauseId)!.text
    if (clauseText.length > 700) {
      const head = clauseText.slice(0, 40).replace(/\s\S*$/, '')
      const tail = clauseText.slice(-40).replace(/^\S*\s/, '')
      vs.push({ kind: 'uzak parçaları "..." ile yapıştırma', expect: 'reject', quote: `${head} ... ${tail}`, cite: (c) => c })
    }
    for (const v of vs) {
      const r = verifyQuote(index, v.cite(real.clauseId), v.quote)
      // Başka belgeden alınan alıntı bu belgede de birebir geçiyorsa (ortak kalıp cümle) reddedilmesi beklenmez.
      if (v.kind === 'başka belgeden alıntı' && r.ok) continue
      // Ters sıradaki parçalar maddede gerçekten o sırada (ve yakın) geçiyorsa kabul doğrudur; bu örneği sayma.
      if (v.kind === '"..." parçaları ters sırada' && findOrderedParts(wholeNorm, splitQuoteParts(v.quote)) >= 0) continue
      const accepted = r.ok && (v.kind !== 'yanlış madde ID (düzeltilmeli)' || (r.clauseId === real.clauseId))
      const ok = v.expect === 'accept' ? accepted : !r.ok
      const s = stats.get(v.kind) ?? { expect: v.expect, ok: 0, n: 0, fails: [] }
      s.n++
      if (ok) s.ok++
      else if (s.fails.length < 3) s.fails.push(`${gold.doc}: “${v.quote.slice(0, 110)}”`)
      stats.set(v.kind, s)
    }
  })
}

const lines = [
  '# Alıntı doğrulayıcı eval\n',
  `Üretim: \`npx tsx eval/validator-eval.ts\` · ${new Date().toISOString().slice(0, 10)} · kaynak: 6 belgedeki tüm altın çapalar\n`,
  '| Varyant | Beklenen | Doğru karar | Oran |',
  '|---|---|---|---|',
]
for (const [kind, s] of stats) lines.push(`| ${kind} | ${s.expect === 'accept' ? 'kabul' : 'ret'} | ${s.ok}/${s.n} | ${Math.round((s.ok / s.n) * 100)}% |`)
const failures = [...stats].filter(([, s]) => s.fails.length)
if (failures.length) {
  lines.push('\n## Hatalı kararlar (ilk örnekler)\n')
  for (const [kind, s] of failures) for (const f of s.fails) lines.push(`- **${kind}** — ${f}`)
}
lines.push(
  '\n**Sınırlama:** doğrulayıcı alıntının metinde *geçtiğini* kanıtlar; alıntının *doğru yorumlandığını* (kategori/şiddet/açıklama) kanıtlamaz. Bu kısım LLM eval\'inde ölçülür.',
)
await mkdir('eval/results/validator', { recursive: true })
await writeFile('eval/results/validator/README.md', lines.join('\n') + '\n')
console.log(lines.join('\n'))
