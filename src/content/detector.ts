import { detectLegalPage } from '../core/detect'

/**
 * Her sayfada çalışan hafif dedektör: sadece URL, başlık ve ilk 20 bin karakterlik
 * metinle sözleşme sayfası olasılığını hesaplar ve uzantı simgesine rozet koydurur.
 * Sayfa metni hiçbir yere GÖNDERİLMEZ; analiz kullanıcı tıklayınca başlar.
 */
function run() {
  const headings = Array.from(document.querySelectorAll('h1, h2'))
    .map((h) => (h.textContent ?? '').trim())
    .slice(0, 10)
  const text = (document.body?.innerText ?? '').slice(0, 20_000)
  const detection = detectLegalPage({ url: location.href, title: document.title, headings, text })
  chrome.runtime.sendMessage({ type: 'SR_DETECTED', detection }).catch(() => {})
}

if (document.readyState === 'complete') run()
else window.addEventListener('load', run, { once: true })
