import type { ExtractionResult } from '../content/extract'
import type { LlmSettings } from '../core/llm'
import type { Detection } from '../core/detect'

/**
 * UI ile çalışma ortamı arasındaki ince katman. Uzantıda chrome.* API'leri,
 * Cypress düzeneğinde (harness) ise aynı arayüzü sağlayan bir köprü kullanılır.
 * Böylece test edilen UI + pipeline kodu, uzantıdakiyle birebir aynıdır.
 */
export interface Platform {
  name: 'extension' | 'harness'
  extractActiveTab(): Promise<ExtractionResult>
  getDetection(): Promise<Detection | null>
  loadSettings(): Promise<Partial<LlmSettings>>
  saveSettings(s: LlmSettings): Promise<void>
  /** Alıntıyı analiz edilen sayfada bulup seçer ve görünür alana kaydırır. */
  revealQuote(quote: string): Promise<boolean>
  /** LLM uç noktası için host izni ister (yalnızca o origin). */
  ensureHostPermission(baseURL: string): Promise<boolean>
  fetch: typeof fetch
}

declare global {
  interface Window {
    __SR_PLATFORM__?: Platform
  }
}

/**
 * Hedef sekme: normalde aktif sekme. `?tab=<id>` yalnızca uzantının kendi sayfası
 * açılırken verilebilir (web sayfaları chrome-extension:// URL'si açamaz); otomatik
 * uzantı testinde (scripts/smoke-extension.mjs) yan paneli belirli sekmeye bağlamak için kullanılır.
 */
async function targetTab(): Promise<chrome.tabs.Tab | undefined> {
  const pinned = Number(new URLSearchParams(location.search).get('tab'))
  if (pinned) return chrome.tabs.get(pinned)
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab
}

export function createChromePlatform(): Platform {
  return {
    name: 'extension',
    async extractActiveTab() {
      const tab = await targetTab()
      if (!tab?.id) throw new Error('Aktif sekme bulunamadı.')
      if (tab.url && !/^https?:|^file:/.test(tab.url)) throw new Error('Bu sekme analiz edilemez (yalnızca http/https sayfaları).')
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/extract.js'] })
      } catch {
        // activeTab izni yalnızca simgeye tıklanan sekme için verilir.
        throw new Error('Bu sekmeye erişim izni yok. Sayfadayken uzantı simgesine tekrar tıklayın.')
      }
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'SR_EXTRACT' })
      if (!res?.ok) throw new Error(res?.error ?? 'Sayfa metni okunamadı.')
      return res.doc as ExtractionResult
    },
    async revealQuote(quote) {
      const tab = await targetTab()
      if (!tab?.id) return false
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: findInPage, args: [quote] })
      return Boolean(res?.result)
    },
    async getDetection() {
      const tab = await targetTab()
      if (!tab?.id) return null
      const key = `detect:${tab.id}`
      const got = await chrome.storage.session.get(key)
      return (got[key] as Detection | undefined) ?? null
    },
    async loadSettings() {
      const got = await chrome.storage.local.get('llm')
      return (got.llm as Partial<LlmSettings>) ?? {}
    },
    async saveSettings(s) {
      await chrome.storage.local.set({ llm: s })
    },
    async ensureHostPermission(baseURL) {
      const origin = `${new URL(baseURL).origin}/*`
      if (await chrome.permissions.contains({ origins: [origin] })) return true
      return chrome.permissions.request({ origins: [origin] })
    },
    fetch: (...args) => fetch(...args),
  }
}

/**
 * Sayfada çalışır (executeScript ile enjekte edilir): alıntının ilk parçasını
 * tarayıcının kendi metin aramasıyla bulur, seçer ve kaydırır. Sayfayı değiştirmez.
 */
export function findInPage(quote: string): boolean {
  const first = quote.split(/\s*(?:\.\.\.|…)\s*/)[0].trim().slice(0, 160)
  const w = window as Window & { find?: (s: string, caseSensitive?: boolean, backwards?: boolean, wrap?: boolean) => boolean }
  window.getSelection()?.removeAllRanges()
  return Boolean(first && w.find?.(first, false, false, true))
}
