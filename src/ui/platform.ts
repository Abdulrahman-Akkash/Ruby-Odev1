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
  /** LLM uç noktası için host izni ister (yalnızca o origin). */
  ensureHostPermission(baseURL: string): Promise<boolean>
  fetch: typeof fetch
}

declare global {
  interface Window {
    __SR_PLATFORM__?: Platform
  }
}

export function createChromePlatform(): Platform {
  return {
    name: 'extension',
    async extractActiveTab() {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      if (!tab?.id || !tab.url || !/^https?:|^file:/.test(tab.url)) throw new Error('Bu sekme analiz edilemez (yalnızca http/https sayfaları).')
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/extract.js'] })
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'SR_EXTRACT' })
      if (!res?.ok) throw new Error(res?.error ?? 'Sayfa metni okunamadı.')
      return res.doc as ExtractionResult
    },
    async getDetection() {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
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
