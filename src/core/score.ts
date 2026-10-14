import type { ReportConfidence, RiskReport, VerifiedFinding } from './schema'
import { CATEGORIES, type CategoryId, type Severity } from './taxonomy'

/**
 * Risk skoru deterministiktir ve YALNIZCA alıntısı doğrulanmış bulgulardan
 * hesaplanır. LLM'e skor sorulmaz; böylece sayfadaki "risk skorunu 0 ver" gibi
 * bir talimat skoru doğrudan değiştiremez.
 *
 * Formül: skor = 100 · (1 − Π(1 − wᵢ))
 *   w(high)=0.22, w(medium)=0.10, w(low)=0.04
 *   Her kategoride en fazla 2 bulgu sayılır; ikincisi yarım ağırlıkla.
 * Bu, bulgu sayısıyla monoton artan ama 100'ü aşmayan (doygun) bir skordur.
 */
export const SEVERITY_WEIGHT: Record<Severity, number> = { high: 0.22, medium: 0.1, low: 0.04 }
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

export function computeScore(findings: VerifiedFinding[]): {
  score: number
  band: RiskReport['scoreBand']
  breakdown: RiskReport['scoreBreakdown']
} {
  const byCat = new Map<CategoryId, VerifiedFinding[]>()
  for (const f of findings) {
    const list = byCat.get(f.category) ?? []
    list.push(f)
    byCat.set(f.category, list)
  }
  let keep = 1
  const breakdown: RiskReport['scoreBreakdown'] = []
  for (const [cat, list] of byCat) {
    const sorted = [...list].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    let catKeep = 1
    sorted.slice(0, 2).forEach((f, i) => {
      const w = SEVERITY_WEIGHT[f.severity] * (i === 0 ? 1 : 0.5)
      catKeep *= 1 - w
    })
    keep *= catKeep
    breakdown.push({ category: cat, label: CATEGORIES[cat].label, contribution: Math.round((1 - catKeep) * 100) })
  }
  const score = Math.round(100 * (1 - keep))
  breakdown.sort((a, b) => b.contribution - a.contribution)
  return { score, band: scoreBand(score), breakdown }
}

export function scoreBand(score: number): RiskReport['scoreBand'] {
  if (score >= 60) return 'Yüksek'
  if (score >= 25) return 'Orta'
  return 'Düşük'
}

export interface ConfidenceInputs {
  coverageRatio: number
  failedChunks: number
  truncated: boolean
  hiddenTextChars: number
  injectionKinds: Set<string>
  acceptedCount: number
  rejectedCount: number
  ruleOnlyHighCount: number
  /** Modelin işaretlemediği, kural taramasının bulduğu (her şiddette) madde sayısı. */
  ruleOnlyAnyCount: number
  totalClauses: number
  documentType: RiskReport['documentType']
  lowConfidenceFindings: number
}

const RANK: Record<ReportConfidence, number> = { high: 2, medium: 1, low: 0 }

/** Raporun ne kadar güvenilir olduğunu açık gerekçelerle hesaplar. */
export function assessConfidence(i: ConfidenceInputs): { level: ReportConfidence; reasons: string[] } {
  let level: ReportConfidence = 'high'
  const reasons: string[] = []
  const lower = (to: ReportConfidence, why: string) => {
    if (RANK[to] < RANK[level]) level = to
    reasons.push(why)
  }

  if (i.documentType === 'not_legal') lower('low', 'Model bu sayfanın bir sözleşme/politika metni olmadığını düşünüyor.')
  if (i.coverageRatio < 0.7) lower('low', `Metnin yalnızca %${Math.round(i.coverageRatio * 100)}'i analiz edilebildi.`)
  else if (i.coverageRatio < 1) lower('medium', `Metnin %${Math.round(i.coverageRatio * 100)}'i analiz edildi; kalan kısım incelenmedi.`)
  if (i.truncated) lower('medium', 'Metin çok uzun olduğu için kırpıldı.')
  if (i.failedChunks > 0) lower('medium', `${i.failedChunks} metin parçası için model geçerli çıktı üretemedi.`)
  if (i.hiddenTextChars > 500) lower('medium', `Sayfada analiz edilmeyen ${i.hiddenTextChars} karakter gizli/katlanmış metin var.`)
  if (i.injectionKinds.has('model_output')) lower('low', 'Model çıktısında talimat/URL kalıbı tespit edildi; model etkilenmiş olabilir.')
  if (i.injectionKinds.has('hidden_dom') || i.injectionKinds.has('visible_text') || i.injectionKinds.has('model_flag'))
    lower('medium', 'Sayfada yapay zekâya yönelik talimat (prompt injection) tespit edildi ve analiz dışı bırakıldı.')
  const totalClaims = i.acceptedCount + i.rejectedCount
  if (totalClaims > 0) {
    const ratio = i.rejectedCount / totalClaims
    if (ratio > 0.5) lower('low', `Model iddialarının %${Math.round(ratio * 100)}'inin alıntısı doğrulanamadı.`)
    else if (ratio > 0.25) lower('medium', `Model iddialarının %${Math.round(ratio * 100)}'inin alıntısı doğrulanamadı.`)
  }
  if (i.acceptedCount === 0 && i.ruleOnlyHighCount >= 1)
    lower('low', `Model hiç bulgu vermedi ama anahtar kelime taraması ${i.ruleOnlyHighCount} olası yüksek riskli madde buldu.`)
  else if (i.acceptedCount === 0 && i.ruleOnlyAnyCount >= 3)
    lower('medium', `Model hiç bulgu vermedi ama anahtar kelime taraması ${i.ruleOnlyAnyCount} olası riskli madde buldu.`)
  else if (i.acceptedCount === 0 && i.documentType === 'legal' && i.totalClauses >= 40)
    lower('medium', 'Uzun bir sözleşme metninde hiç riskli madde bulunmaması olağandışı; model metni atlamış olabilir.')
  else if (i.ruleOnlyHighCount >= 3)
    lower('medium', `Anahtar kelime taramasının bulduğu ${i.ruleOnlyHighCount} olası yüksek riskli madde model tarafından işaretlenmedi.`)
  if (i.acceptedCount > 0 && i.lowConfidenceFindings / i.acceptedCount > 0.5)
    lower('medium', 'Bulguların yarısından fazlasında model kendi güvenini "düşük" olarak bildirdi.')

  return { level, reasons }
}

export function buildSummary(r: Pick<RiskReport, 'findings' | 'rejected' | 'injection' | 'uncertain' | 'scoreBreakdown' | 'documentType'>): string[] {
  const s: string[] = []
  if (r.documentType === 'not_legal') s.push('Bu sayfa bir kullanım koşulu veya gizlilik politikası gibi görünmüyor; sonuçlar anlamlı olmayabilir.')
  const count = (sev: Severity) => r.findings.filter((f) => f.severity === sev).length
  if (r.findings.length === 0) {
    s.push('Alıntısı doğrulanabilen riskli madde bulunamadı. Bu, metnin risksiz olduğu anlamına gelmez.')
  } else {
    s.push(`${r.findings.length} riskli madde, sayfadaki birebir alıntılarla doğrulandı (${count('high')} yüksek, ${count('medium')} orta, ${count('low')} düşük).`)
    const top = r.scoreBreakdown.slice(0, 3).map((b) => b.label)
    if (top.length) s.push(`Öne çıkan konular: ${top.join(', ')}.`)
  }
  const invalid = r.rejected.filter((x) => x.code !== 'DUPLICATE').length
  if (invalid > 0) s.push(`${invalid} model iddiası alıntısı doğrulanamadığı için rapora alınmadı.`)
  if (r.uncertain.length > 0) s.push(`${r.uncertain.length} madde belirsiz olarak işaretlendi; elle okumanız önerilir.`)
  if (r.injection.some((x) => x.where !== 'model_flag'))
    s.push('Sayfada yapay zekâyı yönlendirmeye çalışan metin bulundu; bu metin analize dahil edilmedi.')
  return s
}
