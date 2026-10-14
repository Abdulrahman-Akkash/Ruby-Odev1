import { scanForInjection, type InjectionMatch } from './injection'
import type { ChunkRunner } from './llm'
import { buildSystemPrompt, buildUserMessage, makeNonce } from './prompt'
import { runRules } from './rules'
import { DISCLAIMER, type InjectionSignal, type RejectedClaim, type RiskReport, type UncertainItem, type VerifiedFinding } from './schema'
import { assessConfidence, buildSummary, computeScore } from './score'
import { chunkClauses, segmentText, type Clause } from './segment'
import { buildClauseIndex, dedupeFindings, validateChunkOutput } from './validate'

/** İçerik betiğinin (veya eval'in) ürettiği, analiz edilecek belge. */
export interface ExtractedDocument {
  url: string
  title: string
  /** Yalnızca GÖRÜNÜR metin (page-agent PageController ile çıkarılır). */
  text: string
  hidden?: {
    /** Görünmeyen (display:none, 0px yazı, ekran dışı vb.) metin karakter sayısı. */
    chars: number
    /** Gizli metinde bulunan enjeksiyon kalıpları. */
    injection: InjectionMatch[]
  }
}

export interface ChunkTrace {
  part: number
  clauseIds: string[]
  ok: boolean
  error?: string
  raw?: unknown
  passedToolSchema?: boolean
  accepted: number
  rejected: number
}

export interface AnalyzeOptions {
  runner: ChunkRunner
  model: string
  maxChunkChars?: number
  maxChunks?: number
  concurrency?: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
  now?: () => Date
}

export interface AnalyzeResult {
  report: RiskReport
  clauses: Clause[]
  trace: ChunkTrace[]
}

function sentenceAround(text: string, match: string): string {
  const i = text.indexOf(match)
  if (i < 0) return text.slice(0, 240)
  const start = Math.max(text.lastIndexOf('. ', i) + 2, i - 200, 0)
  const endDot = text.indexOf('. ', i + match.length)
  const end = Math.min(endDot < 0 ? text.length : endDot + 1, i + match.length + 200)
  return text.slice(start, end).trim()
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

export async function analyzeDocument(doc: ExtractedDocument, opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const maxChunkChars = opts.maxChunkChars ?? 12_000
  const maxChunks = opts.maxChunks ?? 10
  const clauses = segmentText(doc.text)

  // 1) Görünür metinde enjeksiyon taraması → ilgili bölütler karantinaya (LLM'e gitmez).
  const injection: InjectionSignal[] = []
  const quarantined = new Set<string>()
  for (const c of clauses) {
    const hits = scanForInjection(c.text, 3)
    if (hits.length) {
      quarantined.add(c.id)
      for (const h of hits) injection.push({ where: 'visible_text', excerpt: `[${c.id}] ${h.excerpt}`, pattern: h.pattern })
    }
  }
  for (const h of doc.hidden?.injection ?? []) injection.push({ where: 'hidden_dom', excerpt: h.excerpt, pattern: h.pattern })

  const index = buildClauseIndex(clauses, quarantined)
  const analyzable = clauses.filter((c) => !quarantined.has(c.id))
  const allChunks = chunkClauses(analyzable, maxChunkChars)
  const truncated = allChunks.length > maxChunks
  const chunks = allChunks.slice(0, maxChunks)

  // 2) Her parça için tek bir zorunlu tool-call; çıktı deterministik doğrulamadan geçer.
  const nonce = makeNonce()
  const system = buildSystemPrompt(nonce)
  let done = 0
  opts.onProgress?.(0, chunks.length)
  const findings: VerifiedFinding[] = []
  const uncertain: UncertainItem[] = []
  const rejected: RejectedClaim[] = []
  const legalVotes: boolean[] = []
  const trace = await mapLimit(chunks, opts.concurrency ?? 2, async (chunk, i): Promise<ChunkTrace> => {
    const clauseIds = chunk.map((c) => c.id)
    try {
      const user = buildUserMessage({ nonce, url: doc.url, title: doc.title, clauses: chunk, part: i + 1, parts: chunks.length })
      const res = await opts.runner({ system, user }, opts.signal)
      const v = validateChunkOutput(res.raw, index)
      findings.push(...v.findings)
      uncertain.push(...v.uncertain)
      rejected.push(...v.rejected)
      injection.push(...v.injection)
      if (v.isLegalText !== null) legalVotes.push(v.isLegalText)
      const ok = v.isLegalText !== null
      return { part: i + 1, clauseIds, ok, raw: res.raw, passedToolSchema: res.passedToolSchema, accepted: v.findings.length, rejected: v.rejected.length }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      return { part: i + 1, clauseIds, ok: false, error: String((err as Error)?.message ?? err).slice(0, 300), accepted: 0, rejected: 0 }
    } finally {
      opts.onProgress?.(++done, chunks.length)
    }
  })

  const failed = trace.filter((t) => !t.ok)
  for (const t of failed) {
    uncertain.push({
      source: 'validator',
      clauseId: `${t.clauseIds[0]}–${t.clauseIds[t.clauseIds.length - 1]}`,
      reason: `Bu aralık analiz edilemedi${t.error ? ` (${t.error})` : ' (model geçerli çıktı üretmedi)'}. Bu maddeleri elle okuyun.`,
    })
  }
  if (truncated) {
    const skipped = allChunks.slice(maxChunks).flat()
    uncertain.push({
      source: 'validator',
      clauseId: `${skipped[0].id}–${skipped[skipped.length - 1].id}`,
      reason: `Metin uzunluk sınırını aştı; bu ${skipped.length} madde analiz edilmedi.`,
    })
  }

  const { kept, dropped } = dedupeFindings(findings)
  rejected.push(...dropped)

  // 3) Kural tabanlı ikinci görüş: modelin görmezden geldiği yüksek riskli adaylar.
  const analyzedIds = new Set(trace.filter((t) => t.ok).flatMap((t) => t.clauseIds))
  const ruleHits = runRules(analyzable)
  const flaggedClauses = new Set([...kept.map((f) => f.clauseId), ...uncertain.map((u) => u.clauseId)])
  for (const f of kept) f.ruleAgreement = ruleHits.some((h) => h.clauseId === f.clauseId && h.category === f.category)
  const ruleOnly = ruleHits.filter((h) => analyzedIds.has(h.clauseId) && !flaggedClauses.has(h.clauseId))
  const ruleOnlyHigh = ruleOnly.filter((h) => h.severity === 'high')
  // Model hiç bulgu vermediyse orta şiddetli kural eşleşmelerini de göster (susturulmuş model senaryosu).
  const toList = kept.length === 0 ? ruleOnly.filter((h) => h.severity !== 'low').sort((a, b) => (a.severity === 'high' ? -1 : 0) - (b.severity === 'high' ? -1 : 0)) : ruleOnlyHigh
  const seenRuleClause = new Set<string>()
  for (const h of toList) {
    if (seenRuleClause.has(h.clauseId) || seenRuleClause.size >= 8) continue
    seenRuleClause.add(h.clauseId)
    const clause = index.byId.get(h.clauseId)!
    uncertain.push({
      source: 'rules',
      clauseId: h.clauseId,
      quote: sentenceAround(clause.text, h.match),
      reason: `Anahtar kelime taraması "${h.match.slice(0, 60)}" ifadesini buldu ama model bu maddeyi işaretlemedi. Yanlış alarm olabilir; elle kontrol edin.`,
    })
  }

  // 4) Deterministik skor, güven ve özet.
  const documentType: RiskReport['documentType'] =
    legalVotes.length === 0 ? 'unknown' : legalVotes.filter((x) => !x).length > legalVotes.length / 2 ? 'not_legal' : 'legal'
  const { score, band, breakdown } = computeScore(kept)
  const analyzedClauses = analyzedIds.size
  const coverageRatio = clauses.length === 0 ? 0 : analyzedClauses / Math.max(1, analyzable.length)
  const invalidCount = rejected.filter((r) => r.code !== 'DUPLICATE').length
  const conf = assessConfidence({
    coverageRatio,
    failedChunks: failed.length,
    truncated,
    hiddenTextChars: doc.hidden?.chars ?? 0,
    injectionKinds: new Set(injection.map((x) => x.where)),
    acceptedCount: kept.length,
    rejectedCount: invalidCount,
    ruleOnlyHighCount: new Set(ruleOnlyHigh.map((h) => h.clauseId)).size,
    ruleOnlyAnyCount: new Set(ruleOnly.map((h) => h.clauseId)).size,
    totalClauses: clauses.length,
    documentType,
    lowConfidenceFindings: kept.filter((f) => f.confidence === 'low').length,
  })
  if (clauses.length === 0) conf.reasons.unshift('Sayfada analiz edilecek metin bulunamadı.')

  const order = new Map(clauses.map((c, i) => [c.id, i]))
  const sevRank = { high: 0, medium: 1, low: 2 } as const
  kept.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || (order.get(a.clauseId)! - order.get(b.clauseId)!))

  const partial = {
    findings: kept,
    rejected,
    injection,
    uncertain,
    scoreBreakdown: breakdown,
    documentType,
  }
  const report: RiskReport = {
    schemaVersion: 1,
    url: doc.url,
    title: doc.title,
    analyzedAt: (opts.now?.() ?? new Date()).toISOString(),
    model: opts.model,
    documentType,
    score,
    scoreBand: band,
    scoreBreakdown: breakdown,
    summary: buildSummary(partial),
    findings: kept,
    uncertain,
    rejected,
    injection,
    coverage: {
      totalClauses: clauses.length,
      analyzedClauses,
      failedChunks: failed.length,
      hiddenTextChars: doc.hidden?.chars ?? 0,
      truncated,
    },
    confidence: clauses.length === 0 ? 'low' : conf.level,
    confidenceReasons: conf.reasons,
    disclaimer: DISCLAIMER,
  }
  return { report, clauses, trace }
}
