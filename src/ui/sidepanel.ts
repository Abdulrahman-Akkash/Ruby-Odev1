import { createPageAgentRunner, type LlmSettings } from '../core/llm'
import { analyzeDocument } from '../core/pipeline'
import { DISCLAIMER, type RiskReport } from '../core/schema'
import { SEVERITY_LABEL } from '../core/taxonomy'
import { createChromePlatform, type Platform } from './platform'

/**
 * Yan panel arayüzü. GÜVENLİK: sayfadan veya modelden gelen hiçbir metin
 * innerHTML ile basılmaz; her şey textContent ile yazılır (XSS yok).
 */

const platform: Platform = window.__SR_PLATFORM__ ?? createChromePlatform()

type Child = Node | string | null | undefined | false
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    el.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return el
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const PRESETS: Record<string, { baseURL: string; model: string }> = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: '' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  ollama: { baseURL: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
}

let lastReport: RiskReport | null = null
let abort: AbortController | null = null

function setStatus(text: string, kind: 'info' | 'error' | 'busy' = 'info') {
  const el = $('status')
  el.textContent = text
  el.dataset.kind = kind
  el.hidden = !text
}

async function readSettings(): Promise<LlmSettings | null> {
  const s = await platform.loadSettings()
  if (!s.baseURL || !s.model || !s.apiKey) return null
  return s as LlmSettings
}

async function initSettingsForm() {
  const s = await platform.loadSettings()
  $<HTMLInputElement>('baseURL').value = s.baseURL ?? PRESETS.openai.baseURL
  $<HTMLInputElement>('model').value = s.model ?? PRESETS.openai.model
  $<HTMLInputElement>('apiKey').value = s.apiKey ?? ''
  $<HTMLInputElement>('temperature').value = s.temperature === undefined ? '' : String(s.temperature)
  $<HTMLDetailsElement>('settings').open = !s.apiKey
  $<HTMLSelectElement>('preset').addEventListener('change', (e) => {
    const p = PRESETS[(e.target as HTMLSelectElement).value]
    if (!p) return
    $<HTMLInputElement>('baseURL').value = p.baseURL
    if (p.model) $<HTMLInputElement>('model').value = p.model
  })
  $('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const baseURL = $<HTMLInputElement>('baseURL').value.trim()
    const model = $<HTMLInputElement>('model').value.trim()
    const apiKey = $<HTMLInputElement>('apiKey').value.trim()
    const t = $<HTMLInputElement>('temperature').value.trim()
    try {
      const u = new URL(baseURL)
      if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) throw new Error('Yalnızca https (veya localhost) adresleri kabul edilir.')
    } catch (err) {
      setStatus(`Geçersiz adres: ${(err as Error).message}`, 'error')
      return
    }
    if (!model || !apiKey) {
      setStatus('Model adı ve API anahtarı gerekli.', 'error')
      return
    }
    const granted = await platform.ensureHostPermission(baseURL)
    if (!granted) {
      setStatus('LLM sağlayıcısına erişim izni verilmedi.', 'error')
      return
    }
    await platform.saveSettings({ baseURL, model, apiKey, temperature: t === '' ? undefined : Number(t) })
    $<HTMLDetailsElement>('settings').open = false
    setStatus('Ayarlar kaydedildi. Anahtar yalnızca bu tarayıcıda (chrome.storage.local) tutulur.')
    void refreshProvider()
  })
}

async function refreshProvider() {
  const s = await readSettings()
  $('provider').textContent = s ? `Metin şu sağlayıcıya gönderilir: ${new URL(s.baseURL).host} · model: ${s.model}` : 'Henüz LLM ayarı yok — kendi API anahtarınızı girin.'
}

async function refreshDetection() {
  const d = await platform.getDetection().catch(() => null)
  const el = $('detection')
  el.replaceChildren()
  if (!d) {
    el.append('Sayfa türü henüz tespit edilmedi.')
    return
  }
  const kind = { terms: 'kullanım koşulları', privacy: 'gizlilik politikası', subscription: 'abonelik şartları', unknown: 'sözleşme/politika' }[d.kind]
  el.append(d.isLegal ? `Bu sayfa bir ${kind} metni gibi görünüyor (sinyal: ${Math.round(d.score * 100)}%).` : 'Bu sayfa bir sözleşme metni gibi görünmüyor; yine de analiz edebilirsiniz.')
}

function severityChip(sev: 'low' | 'medium' | 'high') {
  return h('span', { class: `chip sev-${sev}`, 'data-cy': 'severity' }, SEVERITY_LABEL[sev])
}

function renderReport(r: RiskReport) {
  const root = $('report')
  root.replaceChildren()
  const confLabel = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' }[r.confidence]

  root.append(
    h(
      'section',
      { class: 'scorecard', 'data-cy': 'scorecard' },
      h('div', { class: `score band-${r.scoreBand}` }, h('span', { 'data-cy': 'score' }, String(r.score)), h('small', {}, '/100')),
      h(
        'div',
        { class: 'score-meta' },
        h('div', { class: 'band', 'data-cy': 'band' }, `Risk: ${r.scoreBand}`),
        h('div', { class: `confidence conf-${r.confidence}`, 'data-cy': 'confidence' }, `Rapor güveni: ${confLabel}`),
        h('div', { class: 'muted' }, `${r.coverage.analyzedClauses}/${r.coverage.totalClauses} madde analiz edildi · ${r.model}`),
      ),
    ),
  )

  if (r.confidenceReasons.length) {
    root.append(
      h(
        'section',
        { class: 'uncertainty-box', 'data-cy': 'confidence-reasons' },
        h('h3', {}, 'Bu rapor neden kesin değil?'),
        h('ul', {}, ...r.confidenceReasons.map((x) => h('li', {}, x))),
      ),
    )
  }

  root.append(h('section', { class: 'summary', 'data-cy': 'summary' }, h('h3', {}, 'Özet'), h('ul', {}, ...r.summary.map((x) => h('li', {}, x)))))

  const visibleInjection = r.injection.filter((x) => x.where !== 'model_flag')
  if (r.injection.length) {
    root.append(
      h(
        'section',
        { class: 'injection', 'data-cy': 'injection' },
        h('h3', {}, '⚠ Yapay zekâyı yönlendirme girişimi'),
        h('p', {}, 'Bu metin analiz dışı bırakıldı ve skoru etkilemedi. Skor yalnızca alıntısı doğrulanan maddelerden hesaplanır.'),
        h(
          'ul',
          {},
          ...(visibleInjection.length ? visibleInjection : r.injection).slice(0, 6).map((x) =>
            h('li', {}, h('code', {}, { hidden_dom: 'gizli DOM', visible_text: 'görünür metin', model_flag: 'model bildirdi', model_output: 'model çıktısı' }[x.where]), ' ', x.excerpt),
          ),
        ),
      ),
    )
  }

  const list = h('section', { class: 'findings', 'data-cy': 'findings' }, h('h3', {}, `Riskli maddeler (${r.findings.length})`))
  if (!r.findings.length) list.append(h('p', { class: 'muted' }, 'Alıntısı doğrulanmış riskli madde yok.'))
  for (const f of r.findings) {
    list.append(
      h(
        'article',
        { class: 'finding', 'data-cy': 'finding' },
        h('header', {}, severityChip(f.severity), h('strong', {}, f.categoryLabel), h('span', { class: 'clause' }, f.clauseId)),
        h('p', { class: 'explanation' }, f.explanation),
        h('blockquote', { 'data-cy': 'quote' }, `“${f.quote}”`),
        h(
          'footer',
          {},
          h('span', { class: 'chip ok', title: 'Alıntı sayfa metninde birebir bulundu' }, '✓ alıntı doğrulandı'),
          f.ruleAgreement ? h('span', { class: 'chip' }, 'kural taraması da buldu') : null,
          h('span', { class: `chip conf-${f.confidence}` }, `model güveni: ${SEVERITY_LABEL[f.confidence].toLowerCase()}`),
        ),
        ...f.notes.map((n) => h('p', { class: 'note' }, n)),
      ),
    )
  }
  root.append(list)

  if (r.uncertain.length) {
    root.append(
      h(
        'section',
        { class: 'uncertain', 'data-cy': 'uncertain' },
        h('h3', {}, `Belirsiz — elle okuyun (${r.uncertain.length})`),
        ...r.uncertain.map((u) =>
          h(
            'article',
            { class: 'uncertain-item' },
            h('header', {}, h('span', { class: 'chip' }, { model: 'model emin değil', rules: 'yalnız kural taraması', validator: 'analiz edilemedi' }[u.source]), u.clauseId ? h('span', { class: 'clause' }, u.clauseId) : null),
            h('p', {}, u.reason),
            u.quote ? h('blockquote', {}, `“${u.quote}”`) : null,
          ),
        ),
      ),
    )
  }

  const invalid = r.rejected.filter((x) => x.code !== 'DUPLICATE')
  if (invalid.length) {
    root.append(
      h(
        'details',
        { class: 'rejected', 'data-cy': 'rejected' },
        h('summary', {}, `Reddedilen model iddiaları (${invalid.length}) — alıntısız iddia geçersizdir`),
        ...invalid.map((x) =>
          h('article', { class: 'rejected-item' }, h('code', {}, x.code), x.clauseId ? ` ${x.clauseId} ` : ' ', x.reason, x.quote ? h('blockquote', {}, `“${x.quote}”`) : null),
        ),
      ),
    )
  }

  root.append(
    h('p', { class: 'disclaimer-inline' }, r.disclaimer),
    h('button', { id: 'export', type: 'button', class: 'secondary' }, 'Raporu JSON olarak indir'),
  )
  $('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
    const a = h('a', { href: URL.createObjectURL(blob), download: `risk-raporu-${Date.now()}.json` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  })
}

async function analyze() {
  const settings = await readSettings()
  if (!settings) {
    $<HTMLDetailsElement>('settings').open = true
    setStatus('Önce LLM sağlayıcısı, model ve kendi API anahtarınızı girin.', 'error')
    return
  }
  const btn = $<HTMLButtonElement>('analyze')
  btn.disabled = true
  $('report').replaceChildren()
  abort = new AbortController()
  try {
    setStatus('Sayfa metni page-agent ile okunuyor…', 'busy')
    const doc = await platform.extractActiveTab()
    if (doc.text.trim().length < 200) throw new Error('Sayfada analiz edilecek yeterli görünür metin yok.')
    setStatus(`Metin okundu (${doc.text.length.toLocaleString('tr-TR')} karakter). Model çağrılıyor…`, 'busy')
    const runner = createPageAgentRunner(settings, platform.fetch)
    const { report } = await analyzeDocument(doc, {
      runner,
      model: settings.model,
      signal: abort.signal,
      onProgress: (done, total) => setStatus(`Analiz ediliyor: ${done}/${total} parça…`, 'busy'),
    })
    lastReport = report
    renderReport(report)
    setStatus('')
  } catch (err) {
    setStatus(`Analiz başarısız: ${(err as Error).message}`, 'error')
  } finally {
    btn.disabled = false
    abort = null
  }
}

function init() {
  $('disclaimer').textContent = DISCLAIMER
  $('analyze').addEventListener('click', () => void analyze())
  void initSettingsForm()
  void refreshProvider()
  void refreshDetection()
  if (platform.name === 'extension') {
    chrome.tabs.onActivated.addListener(() => {
      void refreshDetection()
      $('report').replaceChildren()
    })
  }
  ;(window as unknown as { __SR_lastReport: () => RiskReport | null }).__SR_lastReport = () => lastReport
}

init()
