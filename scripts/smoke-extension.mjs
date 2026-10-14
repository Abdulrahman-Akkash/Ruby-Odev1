// Gerçek uzantıyı (dist/extension) Chromium'a yükleyip uçtan uca dener:
//  1) dedektör rozeti  2) page-agent çıkarıcısının uzantı bağlamında çalışması
//  3) yan panelde analiz (LLM isteği Playwright ile kayıtlı fixture'a yönlendirilir)
// Kullanım: npm run build && (npm run harness &) && npm run smoke:extension
import { chromium } from 'playwright-core'
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Gerçek kullanımda kullanıcı simgeye tıklayınca Chrome "activeTab" izni verir. Headless testte
// tıklama olmadığından, YALNIZCA test kopyasının manifest'ine localhost + fixture LLM izni eklenir.
const ext = await mkdtemp(join(tmpdir(), 'sr-ext-'))
await cp(resolve('dist/extension'), ext, { recursive: true })
const manifest = JSON.parse(await readFile(join(ext, 'manifest.json'), 'utf8'))
manifest.host_permissions = ['http://localhost/*', 'https://llm.fixture.invalid/*']
await writeFile(join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2))
const BASE = process.env.HARNESS_URL ?? 'http://localhost:4173'
const ctx = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), 'sr-')), {
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  viewport: { width: 1200, height: 900 },
})
let failures = 0
const check = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) failures++ }

let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 })
const extId = new URL(sw.url()).host
console.log('uzantı yüklendi:', extId)

// 1) Dedektör
const page = await ctx.newPage()
await page.goto(`${BASE}/fixtures/netflix-tos.html`)
await page.waitForTimeout(1500)
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: '*://localhost/*' }))[0]?.id)
const detection = await sw.evaluate(async (id) => (await chrome.storage.session.get(`detect:${id}`))[`detect:${id}`], tabId)
const badge = await sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId)
check(detection?.isLegal === true, `dedektör sözleşme sayfasını tanıdı (skor ${detection?.score})`)
check(badge === '!', `simgede rozet var ("${badge}")`)

// 2+3) Yan panel (uzantı sayfası) → executeScript ile page-agent çıkarımı → LLM (fixture) → rapor
const fx = JSON.parse(await readFile('cypress/fixtures/llm/netflix-tos.json', 'utf8'))
const panel = await ctx.newPage()
const requests = []
await ctx.route('https://llm.fixture.invalid/**', async (route) => {
  const body = route.request().postDataJSON()
  requests.push(body)
  const part = Number(/This is part (\d+) of/.exec(body.messages[1].content)?.[1] ?? 1)
  await route.fulfill({
    status: 200,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    body: JSON.stringify({ choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'submit_risk_report', arguments: JSON.stringify(fx.parts[part - 1]) } }] } }] }),
  })
})
await panel.goto(`chrome-extension://${extId}/ui/sidepanel.html?tab=${tabId}`)
await panel.evaluate(() => chrome.storage.local.set({ llm: { baseURL: 'https://llm.fixture.invalid/v1', model: 'kayitli-yanit (fixture)', apiKey: 'fixture-key' } }))
await panel.reload()
check(await panel.locator('[data-cy=disclaimer]').isVisible(), 'hukuki tavsiye uyarısı görünür')
check((await panel.textContent('[data-cy=detection]')).includes('kullanım koşulları'), 'panel tespit sonucunu gösteriyor')
await panel.click('[data-cy=analyze]')
await panel.waitForSelector('[data-cy=score], .status[data-kind=error]', { timeout: 30000 })
const status = await panel.textContent('[data-cy=status]')
check(!(await panel.locator('.status[data-kind=error]').isVisible()), `analiz hatasız tamamlandı ${status ? `(${status})` : ''}`)
check(requests.length === 2, `LLM'e 2 parça gönderildi (${requests.length})`)
check(requests.every((r) => r.tool_choice && r.tools?.[0]?.function?.name === 'submit_risk_report'), 'istekler zorunlu tool-call (JSON şema) kullanıyor')
const n = await panel.locator('[data-cy=finding]').count()
check(n >= 5, `${n} doğrulanmış bulgu`)
await panel.locator('[data-cy=reveal]').first().click()
await panel.waitForTimeout(300)
const sel = await page.evaluate(() => getSelection().toString())
check(sel.includes('non-refundable'), '"Sayfada göster" gerçek sekmede alıntıyı seçti')
await panel.screenshot({ path: 'docs/img/extension-sidepanel.png', fullPage: false })
console.log('   skor:', await panel.textContent('[data-cy=score]'))
await ctx.close()
console.log(failures ? `\n${failures} kontrol BAŞARISIZ` : '\nUzantı smoke testi geçti')
process.exit(failures ? 1 : 0)
