/**
 * Sayfanın bir kullanım koşulu / gizlilik politikası / abonelik şartı olup
 * olmadığını LLM'siz, ucuz sinyallerle tahmin eder. Yalnızca uzantı simgesinde
 * rozet göstermek için kullanılır; analiz her zaman kullanıcının tıklamasıyla başlar
 * (sayfa metni kullanıcı onayı olmadan üçüncü taraf LLM'e gönderilmez).
 */

export type LegalKind = 'terms' | 'privacy' | 'subscription' | 'unknown'

export interface Detection {
  isLegal: boolean
  score: number
  kind: LegalKind
  reasons: string[]
}

const URL_HINTS: [RegExp, LegalKind][] = [
  [/(privacy|gizlilik|kvkk|aydinlatma|cookie|cerez|data-?policy)/i, 'privacy'],
  [/(subscription|abonelik|billing|membership|uyelik)/i, 'subscription'],
  [/(terms|tos\b|legal|conditions|kosullar|sozlesme|agreement|eula|user-?agreement)/i, 'terms'],
]

const TITLE_HINTS: [RegExp, LegalKind][] = [
  [/(privacy (policy|notice|statement)|gizlilik (politikası|sözleşmesi|bildirimi)|aydınlatma metni|kvkk|çerez politikası|cookie policy)/i, 'privacy'],
  [/(subscription (terms|agreement)|abonelik (şartları|sözleşmesi|koşulları)|membership terms|üyelik sözleşmesi)/i, 'subscription'],
  [/(terms of (service|use)|terms (and|&) conditions|user agreement|kullanım (koşulları|şartları)|hizmet (şartları|sözleşmesi)|kullanıcı sözleşmesi|eula|(üyelik|kullanım|hizmet) (koşulları|şartları))/i, 'terms'],
]

const TEXT_TERMS = /\b(shall|hereby|liabilit\w*|indemnif\w*|governing law|arbitration|terminate|warrant\w*|personal (data|information)|third[- ]part\w*|işbu|sözleşme|yükümlülük|kişisel veri|sorumluluk)\b/gi

export function detectLegalPage(input: { url: string; title: string; headings: string[]; text: string }): Detection {
  const reasons: string[] = []
  let score = 0
  let kind: LegalKind = 'unknown'
  let path = input.url
  try {
    const u = new URL(input.url)
    path = `${u.hostname}${u.pathname}`
  } catch {
    /* göreli/bozuk URL */
  }
  for (const [re, k] of URL_HINTS) {
    if (re.test(path)) {
      score += 0.35
      kind = k
      reasons.push(`URL "${re.source.split('|')[0].replace(/[()]/g, '')}" içeriyor`)
      break
    }
  }
  const titleish = [input.title, ...input.headings].join(' | ')
  for (const [re, k] of TITLE_HINTS) {
    if (re.test(titleish)) {
      score += 0.4
      kind = k
      reasons.push('Başlık sözleşme/politika ifadesi içeriyor')
      break
    }
  }
  const words = Math.max(1, input.text.split(/\s+/).length)
  const legalTerms = (input.text.match(TEXT_TERMS) ?? []).length
  const density = (legalTerms / words) * 1000
  if (words > 400 && density > 4) {
    score += Math.min(0.35, density / 40)
    reasons.push(`Hukuki terim yoğunluğu yüksek (${density.toFixed(1)}/1000 kelime)`)
  }
  score = Math.min(1, score)
  return { isLegal: score >= 0.5, score: Number(score.toFixed(2)), kind, reasons }
}
