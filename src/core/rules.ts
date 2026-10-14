import type { Clause } from './segment'
import type { CategoryId, Severity } from './taxonomy'

/**
 * Kural tabanlı (anahtar kelime) tarayıcı. İki görevi var:
 *  1. LLM'den bağımsız ikinci görüş: kuralın yakaladığı ama modelin işaretlemediği
 *     maddeler raporda "belirsiz" olarak gösterilir (ör. enjeksiyonla susturulmuş model).
 *  2. Eval'de taban çizgisi (baseline).
 * Skora katkı yapmaz; skor yalnızca alıntısı doğrulanmış LLM bulgularından hesaplanır.
 */

export interface RuleHit {
  clauseId: string
  category: CategoryId
  severity: Severity
  rule: string
  match: string
}

interface Rule {
  name: string
  category: CategoryId
  severity: Severity
  re: RegExp
}

const RULES: Rule[] = [
  // Abonelik
  { name: 'auto_renew', category: 'auto_renewal', severity: 'medium', re: /\b(automatically renew|auto-?renew|renews? automatically|continue (?:month-to-month|until (?:you )?cancel)|recurring (?:billing|charge|payment)|charge[^.]{0,60}(?:each|every) (?:month|year|billing (?:period|cycle))|otomatik(?: olarak)? yenilen)/i },
  { name: 'no_refund', category: 'cancellation_refund', severity: 'high', re: /\b(non-?refundable|no refunds?|not (?:be )?(?:entitled to|eligible for) (?:a )?refunds?|(?:will|do) not (?:provide|issue|give) (?:any )?refunds?|no (?:refunds or credits|credits or refunds)|iade edilmez|iade yapılmaz)/i },
  { name: 'price_change', category: 'price_change', severity: 'medium', re: /\b((?:change|increase|modify|adjust)\w* (?:our |the |its |your )?(?:prices?|fees|pricing|subscription (?:fee|price))|price changes?|fiyat\w* (?:değiştir|artır))/i },
  // Değişiklik / fesih
  { name: 'unilateral_change', category: 'unilateral_changes', severity: 'medium', re: /\b((?:may|can|reserve the right to)[^.]{0,40}(?:change|modify|amend|update|revise)\w*[^.]{0,30}(?:these|the|this|our) (?:terms|agreement|policy|policies)|continued use[^.]{0,80}(?:constitutes?|means|deemed)[^.]{0,30}(?:accept|agree)|koşulları[^.]{0,40}(?:değiştirme|güncelleme) hakkı)/i },
  { name: 'terminate_any_time', category: 'account_termination', severity: 'high', re: /\b((?:suspend|terminate|disable|close|cancel)\w*[^.]{0,80}(?:at any time|for any reason|without (?:prior )?notice|in our (?:sole )?discretion|with or without cause)|hesab\w*[^.]{0,40}(?:bildirimsiz|herhangi bir zamanda) (?:kapat|askıya))/i },
  // Sorumluluk
  { name: 'liability_cap', category: 'liability_limitation', severity: 'high', re: /\b(limitation of liability|(?:not|in no event)[^.]{0,40}(?:be )?liable|aggregate liability|liability[^.]{0,60}(?:shall not exceed|limited to)|sorumlu(?:luk)? (?:tutulamaz|kabul etmez|değildir))/i },
  { name: 'as_is', category: 'liability_limitation', severity: 'medium', re: /\b(["“]?as is["”]?|["“]?as available["”]?|without warrant(?:y|ies) of any kind|disclaim\w* (?:all )?(?:warrant|liabilit))/i },
  { name: 'indemnify', category: 'indemnification', severity: 'medium', re: /\b(indemnif\w*|hold (?:us |\w+ )?harmless|tazmin)/i },
  { name: 'arbitration', category: 'dispute_resolution', severity: 'high', re: /\b(binding (?:individual )?arbitration|arbitrat(?:ion|or)|class (?:action|arbitration)|waive\w*[^.]{0,40}(?:jury|class)|tahkim|toplu dava)/i },
  { name: 'governing_law', category: 'governing_law', severity: 'low', re: /\b(governed by (?:and construed in accordance with )?the laws? of|exclusive (?:jurisdiction|venue)|courts? (?:located )?in [A-Z]|yetkili mahkeme|uygulanacak hukuk)/i },
  // İçerik
  { name: 'broad_license', category: 'content_license', severity: 'high', re: /\b((?:worldwide|perpetual|irrevocable|royalty-free|sublicensable|transferable)[^.]{0,80}licen[cs]e|licen[cs]e[^.]{0,80}(?:worldwide|perpetual|irrevocable|royalty-free|sublicensable))/i },
  // Veri
  { name: 'share_third_parties', category: 'data_sharing', severity: 'medium', re: /\b((?:share|disclose|sell|transfer|provide)\w*[^.]{0,80}(?:third[- ]part|partners|affiliates|advertisers|service providers)|üçüncü (?:taraf|kişi)\w*[^.]{0,40}(?:paylaş|aktar))/i },
  { name: 'retention', category: 'data_retention', severity: 'low', re: /\b((?:retain|keep|store|preserve)\w*[^.]{0,60}(?:information|data|content|records)[^.]{0,80}(?:after|as long as|for (?:a period|up to)|indefinitely|even (?:after|if))|sakla\w*[^.]{0,40}süre)/i },
  { name: 'tracking', category: 'tracking_advertising', severity: 'low', re: /\b((?:targeted|personali[sz]ed|interest-based|behavioral) (?:ads|advertising)|(?:cookies|pixels|web beacons|tracking technologies)[^.]{0,60}(?:advertis|track|analytics)|çerez\w*[^.]{0,40}reklam)/i },
]

export function runRules(clauses: Clause[]): RuleHit[] {
  const hits: RuleHit[] = []
  for (const c of clauses) {
    const seen = new Set<CategoryId>()
    for (const r of RULES) {
      if (seen.has(r.category)) continue
      const m = r.re.exec(c.text)
      if (m) {
        seen.add(r.category)
        hits.push({ clauseId: c.id, category: r.category, severity: r.severity, rule: r.name, match: m[0] })
      }
    }
  }
  return hits
}
