import type { ExtractionResult } from '../content/extract'
import { detectLegalPage } from '../core/detect'
import type { LlmSettings } from '../core/llm'
import { findInPage, type Platform } from '../ui/platform'

/**
 * Cypress test düzeneği için Platform köprüsü. Uzantıdaki chrome.* çağrılarının
 * yerine geçer; geri kalan HER ŞEY (page-agent çıkarıcısı, pipeline, doğrulayıcı,
 * UI) uzantıyla aynı koddur.
 *
 * - "Aktif sekme" = soldaki iframe (#page). Çıkarıcı betik (content/extract.js)
 *   iframe'in içine enjekte edilir, tıpkı chrome.scripting.executeScript gibi.
 * - LLM ayarları localStorage'da tutulur. Varsayılan olarak sahte bir uç nokta
 *   kullanılır; Cypress bu isteği kayıtlı yanıtla (fixture) karşılar.
 *   Canlı mod için Cypress `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` ile ayar yazar.
 */

const SETTINGS_KEY = 'sr-harness-llm'
const DEFAULTS: LlmSettings = { baseURL: 'https://llm.fixture.invalid/v1', model: 'kayitli-yanit (fixture)', apiKey: 'fixture-key' }

function pageFrame(): HTMLIFrameElement {
  const f = document.getElementById('page') as HTMLIFrameElement | null
  if (!f?.contentWindow || !f.contentDocument) throw new Error('Test sayfası yüklenmedi.')
  return f
}

async function ensureExtractor(frame: HTMLIFrameElement): Promise<void> {
  const w = frame.contentWindow as Window & { __sozlesmeRadariExtract?: () => Promise<ExtractionResult> }
  if (w.__sozlesmeRadariExtract) return
  await new Promise<void>((resolve, reject) => {
    const s = frame.contentDocument!.createElement('script')
    s.src = new URL('content/extract.js', location.href).href
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Çıkarıcı betik yüklenemedi.'))
    frame.contentDocument!.head.append(s)
  })
}

const platform: Platform = {
  name: 'harness',
  async extractActiveTab() {
    const frame = pageFrame()
    await ensureExtractor(frame)
    const w = frame.contentWindow as Window & { __sozlesmeRadariExtract: () => Promise<ExtractionResult> }
    return w.__sozlesmeRadariExtract()
  },
  async revealQuote(quote) {
    const w = pageFrame().contentWindow as Window & typeof globalThis
    // findInPage'i iframe'in kendi bağlamında çalıştır (chrome.scripting.executeScript karşılığı)
    return w.Function(`return (${findInPage.toString()})(arguments[0])`)(quote) as boolean
  },
  async getDetection() {
    const frame = document.getElementById('page') as HTMLIFrameElement
    if (frame.contentDocument?.readyState !== 'complete' || frame.contentDocument.URL === 'about:blank')
      await new Promise((r) => frame.addEventListener('load', r, { once: true }))
    const doc = pageFrame().contentDocument!
    const headings = Array.from(doc.querySelectorAll('h1, h2')).map((h) => (h.textContent ?? '').trim())
    return detectLegalPage({ url: doc.location.href, title: doc.title, headings, text: doc.body.innerText.slice(0, 20_000) })
  },
  async loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
    } catch {
      return DEFAULTS
    }
  },
  async saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  },
  async ensureHostPermission() {
    return true
  },
  fetch: (...args) => fetch(...args),
}

window.__SR_PLATFORM__ = platform
