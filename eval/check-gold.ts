// Her altın etiket çapasının çıkarılmış metinde birebir geçtiğini doğrular.
import { readFile, readdir } from 'node:fs/promises'
import { segmentText } from '../src/core/segment'
import { buildClauseIndex, verifyQuote } from '../src/core/validate'
let bad = 0
for (const f of await readdir('eval/gold')) {
  const gold = JSON.parse(await readFile(`eval/gold/${f}`, 'utf8'))
  const doc = JSON.parse(await readFile(`eval/extracted/${gold.doc}.json`, 'utf8'))
  const index = buildClauseIndex(segmentText(doc.text))
  const anchors = [...gold.items.flatMap((i: any) => i.anchors.map((a: string) => [i.id, a])), ...gold.acceptable.map((a: any) => ['acceptable', a.anchor])]
  for (const [id, a] of anchors) {
    const r = verifyQuote(index, '', a)
    if (!r.ok) { bad++; console.log(`${gold.doc} ${id}: ${r.code} :: ${a}`) }
  }
  console.log(gold.doc, 'items', gold.items.length, 'acceptable', gold.acceptable.length)
}
process.exit(bad ? 1 : 0)
