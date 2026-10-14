import * as z from 'zod/v4'
import {
  LlmChunkReportSchema,
  LlmFindingSchema,
  LlmUncertainSchema,
  type InjectionSignal,
  type LlmFinding,
  type LlmUncertain,
  type RejectedClaim,
  type UncertainItem,
  type VerifiedFinding,
} from './schema'
import { findOrderedParts, normalizeForMatch, splitQuoteParts } from './normalize'
import { hasInjection } from './injection'
import { CATEGORIES, SEVERITIES, type Severity } from './taxonomy'
import type { Clause } from './segment'

/**
 * Deterministik doğrulama katmanı. LLM'in söylediği HİÇBİR şey bu katmandan
 * geçmeden rapora girmez:
 *  - Şema: zod ile katı doğrulama (fazla alan, yanlış enum, uzunluk → ret).
 *  - Alıntı: her bulgunun alıntısı kaynak metinde (tipografik normalizasyon
 *    dışında) birebir geçmeli. Geçmiyorsa iddia geçersizdir.
 *  - Karantina: enjeksiyon şüphesiyle LLM'e gönderilmeyen bölütlerden alıntı yapılamaz.
 *  - Açıklama: URL, HTML veya talimat kalıbı içeren açıklama atılır, yerine
 *    taksonomideki sabit açıklama konur.
 */

export const MIN_QUOTE_CHARS = 20
export const MIN_QUOTE_PART_CHARS = 12

export interface ClauseIndex {
  byId: Map<string, Clause & { norm: string }>
  order: string[]
  quarantined: Set<string>
}

export function buildClauseIndex(clauses: Clause[], quarantined: Iterable<string> = []): ClauseIndex {
  const byId = new Map<string, Clause & { norm: string }>()
  for (const c of clauses) byId.set(c.id, { ...c, norm: normalizeForMatch(c.text) })
  return { byId, order: clauses.map((c) => c.id), quarantined: new Set(quarantined) }
}

export type QuoteCheck =
  | { ok: true; clauseId: string; corrected: boolean }
  | { ok: false; code: 'QUOTE_NOT_FOUND' | 'QUOTE_TOO_SHORT' | 'QUOTE_FROM_QUARANTINE'; reason: string }

export function verifyQuote(index: ClauseIndex, citedClauseId: string, quote: string): QuoteCheck {
  const parts = splitQuoteParts(quote)
  const total = parts.reduce((n, p) => n + p.length, 0)
  if (total < MIN_QUOTE_CHARS || parts.some((p) => p.length < MIN_QUOTE_PART_CHARS)) {
    return { ok: false, code: 'QUOTE_TOO_SHORT', reason: `Alıntı doğrulama için çok kısa (en az ${MIN_QUOTE_CHARS} karakter, parça başına ${MIN_QUOTE_PART_CHARS}).` }
  }
  const cited = index.byId.get(citedClauseId)
  if (cited && findOrderedParts(cited.norm, parts) >= 0) {
    if (index.quarantined.has(citedClauseId)) {
      return { ok: false, code: 'QUOTE_FROM_QUARANTINE', reason: 'Alıntı, enjeksiyon şüphesiyle karantinaya alınan bir bölütten.' }
    }
    return { ok: true, clauseId: citedClauseId, corrected: false }
  }
  let quarantineHit = false
  for (const id of index.order) {
    if (id === citedClauseId) continue
    const c = index.byId.get(id)!
    if (findOrderedParts(c.norm, parts) >= 0) {
      if (index.quarantined.has(id)) {
        quarantineHit = true
        continue
      }
      return { ok: true, clauseId: id, corrected: true }
    }
  }
  if (quarantineHit) {
    return { ok: false, code: 'QUOTE_FROM_QUARANTINE', reason: 'Alıntı, enjeksiyon şüphesiyle karantinaya alınan bir bölütten.' }
  }
  // Bölütleme bir cümleyi ikiye ayırmış olabilir: ardışık iki bölütün birleşiminde ara.
  for (let i = 0; i + 1 < index.order.length; i++) {
    const a = index.order[i]
    const b = index.order[i + 1]
    if (index.quarantined.has(a) || index.quarantined.has(b)) continue
    const joined = `${index.byId.get(a)!.norm} ${index.byId.get(b)!.norm}`
    if (findOrderedParts(joined, parts) >= 0) return { ok: true, clauseId: a, corrected: a !== citedClauseId }
  }
  return { ok: false, code: 'QUOTE_NOT_FOUND', reason: 'Alıntı sayfa metninde birebir bulunamadı; iddia geçersiz sayıldı.' }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g

export function sanitizeExplanation(text: string): { text: string; flagged: string | null } {
  const clean = text.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 400)
  if (/https?:\/\/|www\.|<[a-z/!]/i.test(clean)) return { text: clean, flagged: 'url_or_markup_in_explanation' }
  if (hasInjection(clean)) return { text: clean, flagged: 'instruction_pattern_in_explanation' }
  return { text: clean, flagged: null }
}

export interface ChunkValidation {
  schemaValid: boolean
  isLegalText: boolean | null
  modelFlaggedInjection: boolean
  findings: VerifiedFinding[]
  uncertain: UncertainItem[]
  rejected: RejectedClaim[]
  injection: InjectionSignal[]
}

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 }

/**
 * Üst seviye yapı gevşek okunur; her bulgu KENDİ şemasıyla tek tek doğrulanır.
 * Böylece tek bir bozuk madde bütün parçayı düşürmez, ama bozuk madde de
 * asla rapora girmez (SCHEMA_INVALID olarak reddedilir).
 */
const Envelope = z.object({
  is_legal_text: z.boolean().optional(),
  findings: z.array(z.unknown()).max(30),
  uncertain: z.array(z.unknown()).max(10).optional(),
  injection_suspected: z.boolean().optional(),
})

function issueText(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '(kök)'}: ${i.message}`)
    .join('; ')
}

export function validateChunkOutput(raw: unknown, index: ClauseIndex): ChunkValidation {
  const env = Envelope.safeParse(raw)
  if (!env.success) {
    return {
      schemaValid: false,
      isLegalText: null,
      modelFlaggedInjection: false,
      findings: [],
      uncertain: [],
      rejected: [{ code: 'SCHEMA_INVALID', reason: `Model çıktısı JSON şemasına uymuyor: ${issueText(env.error)}` }],
      injection: [],
    }
  }
  const findings: VerifiedFinding[] = []
  const rejected: RejectedClaim[] = []
  const uncertain: UncertainItem[] = []
  const injection: InjectionSignal[] = []
  const strictTop = LlmChunkReportSchema.safeParse(raw).success

  const okFindings: LlmFinding[] = []
  for (const item of env.data.findings) {
    const p = LlmFindingSchema.safeParse(item)
    if (p.success) okFindings.push(p.data)
    else {
      const anyItem = (item ?? {}) as Record<string, unknown>
      rejected.push({
        code: 'SCHEMA_INVALID',
        reason: `Bulgu şemaya uymuyor: ${issueText(p.error)}`,
        clauseId: typeof anyItem.clause_id === 'string' ? anyItem.clause_id.slice(0, 12) : undefined,
        quote: typeof anyItem.quote === 'string' ? anyItem.quote.slice(0, 600) : undefined,
      })
    }
  }
  const okUncertain: LlmUncertain[] = []
  for (const item of env.data.uncertain ?? []) {
    const p = LlmUncertainSchema.safeParse(item)
    if (p.success) okUncertain.push(p.data)
    else rejected.push({ code: 'SCHEMA_INVALID', reason: `Belirsiz madde şemaya uymuyor: ${issueText(p.error)}` })
  }
  const out = {
    is_legal_text: env.data.is_legal_text ?? true,
    injection_suspected: env.data.injection_suspected ?? false,
    findings: okFindings,
    uncertain: okUncertain,
  }

  for (const f of out.findings) {
    const check = verifyQuote(index, f.clause_id, f.quote)
    if (!check.ok) {
      rejected.push({ code: check.code, reason: check.reason, clauseId: f.clause_id, quote: f.quote, category: f.category })
      continue
    }
    const notes: string[] = []
    if (check.corrected) notes.push(`Model ${f.clause_id} dedi; alıntı ${check.clauseId} maddesinde bulundu, düzeltildi.`)
    const expl = sanitizeExplanation(f.explanation_tr)
    let explanation = expl.text
    if (expl.flagged) {
      explanation = CATEGORIES[f.category].fallbackExplanation
      notes.push('Model açıklaması güvenlik filtresine takıldı; standart açıklama gösteriliyor.')
      injection.push({ where: 'model_output', excerpt: expl.text.slice(0, 160), pattern: expl.flagged })
    }
    findings.push({
      clauseId: check.clauseId,
      quote: f.quote.replace(CONTROL_CHARS, '').trim(),
      category: f.category,
      categoryLabel: CATEGORIES[f.category].label,
      severity: f.severity,
      explanation,
      confidence: f.confidence,
      notes,
      ruleAgreement: false,
    })
  }

  for (const u of out.uncertain) {
    const check = verifyQuote(index, u.clause_id, u.quote)
    if (!check.ok) {
      rejected.push({ code: check.code, reason: check.reason, clauseId: u.clause_id, quote: u.quote })
      continue
    }
    const r = sanitizeExplanation(u.reason_tr)
    uncertain.push({
      source: 'model',
      clauseId: check.clauseId,
      quote: u.quote.trim(),
      reason: r.flagged ? 'Model bu maddeden emin olamadı (gerekçe güvenlik filtresine takıldı).' : r.text,
    })
  }

  if (out.injection_suspected) {
    injection.push({ where: 'model_flag', excerpt: 'Model, metinde kendisine yönelik talimat olduğunu bildirdi.', pattern: 'model_flag' })
  }

  return {
    schemaValid: strictTop,
    isLegalText: out.is_legal_text,
    modelFlaggedInjection: out.injection_suspected,
    findings,
    uncertain,
    rejected,
    injection,
  }
}

/** Aynı madde + kategori için tek bulgu bırakır (en yüksek şiddet). */
export function dedupeFindings(findings: VerifiedFinding[]): { kept: VerifiedFinding[]; dropped: RejectedClaim[] } {
  const best = new Map<string, VerifiedFinding>()
  const dropped: RejectedClaim[] = []
  for (const f of findings) {
    const key = `${f.clauseId}|${f.category}`
    const prev = best.get(key)
    if (!prev) {
      best.set(key, f)
      continue
    }
    const keepNew = SEVERITY_RANK[f.severity] > SEVERITY_RANK[prev.severity]
    const loser = keepNew ? prev : f
    if (keepNew) best.set(key, f)
    dropped.push({ code: 'DUPLICATE', reason: 'Aynı madde ve kategori için yinelenen bulgu birleştirildi.', clauseId: loser.clauseId, quote: loser.quote, category: loser.category })
  }
  return { kept: [...best.values()], dropped }
}

export { SEVERITIES }
