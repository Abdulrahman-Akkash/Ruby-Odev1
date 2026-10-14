import { extractDocument } from './extract'

/**
 * Kullanıcı "Analiz et"e bastığında service worker tarafından
 * chrome.scripting.executeScript ile enjekte edilir. Birden fazla enjeksiyonda
 * dinleyicinin tekrar eklenmemesi için bayrak tutulur.
 */
declare global {
  interface Window {
    __sozlesmeRadariExtract?: () => ReturnType<typeof extractDocument>
  }
}

if (!window.__sozlesmeRadariExtract) {
  window.__sozlesmeRadariExtract = extractDocument
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      // Yalnızca kendi uzantımızdan gelen mesajlara cevap ver.
      if (sender.id !== chrome.runtime.id || msg?.type !== 'SR_EXTRACT') return
      extractDocument().then(
        (doc) => sendResponse({ ok: true, doc }),
        (err) => sendResponse({ ok: false, error: String(err?.message ?? err) }),
      )
      return true
    })
  }
}

export {}
