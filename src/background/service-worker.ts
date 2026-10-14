import type { Detection } from '../core/detect'

/**
 * Service worker yalnızca iki iş yapar:
 *  1. Simgeye tıklanınca yan paneli açar.
 *  2. Dedektörden gelen "bu bir sözleşme sayfası olabilir" sinyaliyle rozet koyar.
 * LLM çağrısı ve analiz, eklentinin kendi origin'inde çalışan yan panelde yapılır;
 * API anahtarı hiçbir zaman web sayfasının bağlamına girmez.
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id || msg?.type !== 'SR_DETECTED' || !sender.tab?.id) return
  const tabId = sender.tab.id
  const d = msg.detection as Detection
  chrome.storage.session.set({ [`detect:${tabId}`]: d }).catch(() => {})
  chrome.action.setBadgeText({ tabId, text: d.isLegal ? '!' : '' }).catch(() => {})
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#b45309' }).catch(() => {})
  chrome.action
    .setTitle({ tabId, title: d.isLegal ? 'Sözleşme Radarı — bu sayfa bir sözleşme/politika metni gibi görünüyor' : 'Sözleşme Radarı' })
    .catch(() => {})
})

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`detect:${tabId}`).catch(() => {})
})
