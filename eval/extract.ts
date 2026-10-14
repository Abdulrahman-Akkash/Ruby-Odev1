/**
 * Eval korpusunu UZANTININ KENDİ çıkarıcısıyla metne çevirir:
 * harness/fixtures/<id>.html → Chromium → content/extract.js (page-agent PageController)
 * → eval/extracted/<id>.json. Böylece eval, uzantının gerçek okuma yolunu ölçer.
 * Çıktılar depoya eklenir; eval'i tekrar çalıştırmak için tarayıcı gerekmez.
 *
 * Kullanım: npm run build && npm run harness (ayrı terminal) && npx tsx eval/extract.ts
 */
import { chromium } from 'playwright-core'
import { readFile, writeFile } from 'node:fs/promises'

const BASE = process.env.HARNESS_URL ?? 'http://localhost:4173'
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const sources = JSON.parse(await readFile('eval/corpus/sources.json', 'utf8')) as Record<string, unknown>
const extra = ['injection-terms', 'ambiguous-terms']

const browser = await chromium.launch({ executablePath })
for (const id of [...Object.keys(sources), ...extra]) {
  const page = await browser.newPage()
  await page.goto(`${BASE}/fixtures/${id}.html`)
  await page.addScriptTag({ url: `${BASE}/content/extract.js` })
  const doc = await page.evaluate(() => (window as any).__sozlesmeRadariExtract())
  doc.url = `https://example.test/${id}` // yerel sunucu adresini sabitle (deterministik çıktı)
  await writeFile(`eval/extracted/${id}.json`, JSON.stringify(doc, null, 2))
  console.log(id, doc.text.length, 'chars, hidden', doc.hidden.chars)
  await page.close()
}
await browser.close()
