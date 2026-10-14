import { PageController } from '@page-agent/page-controller'
import { scanForInjection } from '../core/injection'
import { assembleParagraphs, removeLines, simplifiedToLines } from '../core/pagetext'
import type { ExtractedDocument } from '../core/pipeline'
import { detectLegalPage, type Detection } from '../core/detect'

/**
 * Sayfa içinde çalışır. Metni page-agent'in PageController'ı ile okur
 * (DOM → metin; görünmeyen düğümler page-agent tarafından elenir) ve ek olarak
 * page-agent'in yakalamadığı "gizli" metin tekniklerini (ekran dışı, 0 boyut,
 * arka planla aynı renk, kırpma) tespit eder.
 *
 * Bilinçli tercih: page-agent'in AJAN döngüsü (tıklama, yazma, JS çalıştırma)
 * kullanılmaz. Okuduğumuz metin güvenilmez olduğundan, ona eylem yetkisi
 * veren bir ajan prompt-injection için doğrudan saldırı yüzeyi olurdu.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'OBJECT'])

function parseRgb(color: string): [number, number, number, number] | null {
  const m = /rgba?\(([^)]+)\)/.exec(color)
  if (!m) return null
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
}

function luminance([r, g, b]: number[]): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function effectiveBackground(el: Element | null): [number, number, number, number] {
  while (el) {
    const bg = parseRgb(getComputedStyle(el).backgroundColor)
    if (bg && bg[3] > 0.5) return bg
    el = el.parentElement
  }
  return [255, 255, 255, 1]
}

/** page-agent'in görünür saydığı ama insanın göremeyeceği metin mi? */
function stealthReason(el: Element): string | null {
  const style = getComputedStyle(el)
  if (parseFloat(style.fontSize) < 3) return 'tiny_font'
  const rect = el.getBoundingClientRect()
  const docW = Math.max(document.documentElement.scrollWidth, window.innerWidth)
  const docH = Math.max(document.documentElement.scrollHeight, window.innerHeight)
  const left = rect.left + window.scrollX
  const top = rect.top + window.scrollY
  if (rect.width < 2 || rect.height < 2) return 'zero_size'
  if (left + rect.width < 0 || top + rect.height < 0 || left > docW || top > docH) return 'offscreen'
  for (let a: Element | null = el; a; a = a.parentElement) {
    const s = getComputedStyle(a)
    if (s.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(\s*(50%|100%)/.test(s.clipPath)) return 'clipped'
    if (parseFloat(s.opacity) < 0.05) return 'transparent'
  }
  const fg = parseRgb(style.color)
  if (fg) {
    if (fg[3] < 0.1) return 'transparent_text'
    const bg = effectiveBackground(el)
    const l1 = luminance(fg)
    const l2 = luminance(bg)
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    if (contrast < 1.2) return 'same_color_as_background'
  }
  return null
}

export interface HiddenScan {
  chars: number
  stealthTexts: Set<string>
  hiddenText: string
  reasons: Record<string, number>
}

/**
 * @param root Taranacak kök (enjeksiyon araması için tüm body).
 * @param countRoot Kapsam hesabı için sayılan bölge (ana içerik). Menü/çerez
 *   pencereleri gibi gizli arayüz metinleri "analiz edilmeyen içerik" sayılmasın.
 */
export function scanHiddenText(root: Element, countRoot: Element = root): HiddenScan {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const stealthTexts = new Set<string>()
  const hiddenParts: string[] = []
  const reasons: Record<string, number> = {}
  let chars = 0
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.textContent ?? '').replace(/\s+/g, ' ').trim()
    const parent = n.parentElement
    if (!parent || text.length < 3 || !/[\p{L}]{2}/u.test(text)) continue
    let skip = false
    for (let a: Element | null = parent; a && a !== root.parentElement; a = a.parentElement) {
      if (SKIP_TAGS.has(a.tagName.toUpperCase())) {
        skip = true
        break
      }
    }
    if (skip) continue
    const cssVisible = parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const reason = cssVisible ? stealthReason(parent) : 'css_hidden'
    if (!reason) continue
    // Kapalı <details> içeriği meşru katlanmış metindir; page-agent onu da okur.
    if (reason === 'css_hidden' && parent.closest('details:not([open])')) continue
    reasons[reason] = (reasons[reason] ?? 0) + 1
    if (countRoot.contains(parent)) chars += text.length
    hiddenParts.push(text)
    if (reason !== 'css_hidden') stealthTexts.add(text)
  }
  return { chars, stealthTexts, hiddenText: hiddenParts.join('\n'), reasons }
}

export interface ExtractionResult extends ExtractedDocument {
  detection: Detection
  extractor: { engine: string; rawChars: number; hiddenReasons: Record<string, number> }
}

export async function extractDocument(): Promise<ExtractionResult> {
  const controller = new PageController({ viewportExpansion: -1, highlightOpacity: 0, highlightLabelOpacity: 0 })
  let simplified = ''
  try {
    simplified = await controller.updateTree()
  } finally {
    await controller.cleanUpHighlights()
    controller.dispose()
  }
  const main = document.querySelector('main, [role="main"], article') ?? document.body
  const hidden = scanHiddenText(document.body, main)
  const lines = removeLines(simplifiedToLines(simplified), hidden.stealthTexts)
  const text = assembleParagraphs(lines)
  const headings = Array.from(document.querySelectorAll('h1, h2'))
    .map((h) => (h.textContent ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)
  return {
    url: location.href,
    title: document.title,
    text,
    hidden: { chars: hidden.chars, injection: scanForInjection(hidden.hiddenText) },
    detection: detectLegalPage({ url: location.href, title: document.title, headings, text }),
    extractor: { engine: '@page-agent/page-controller', rawChars: simplified.length, hiddenReasons: hidden.reasons },
  }
}
