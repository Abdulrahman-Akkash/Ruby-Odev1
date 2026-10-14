/**
 * LLM ön kontrolü: eval'den önce tek bir küçük, gerçek tool-call isteği yapar.
 * Başarısızsa sağlayıcının hata mesajını (anahtar olmadan) yazdırır ve 1 ile çıkar.
 *   LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=… npx tsx scripts/llm-preflight.ts
 */
import { createPageAgentRunner } from '../src/core/llm'
import { buildSystemPrompt, buildUserMessage, makeNonce } from '../src/core/prompt'
import { segmentText } from '../src/core/segment'
import { validateChunkOutput, buildClauseIndex } from '../src/core/validate'

const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = process.env
if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
  console.error('LLM_BASE_URL, LLM_MODEL ve LLM_API_KEY gerekli.')
  process.exit(2)
}
const mask = (s: string) => (LLM_API_KEY.length >= 8 ? s.split(LLM_API_KEY).join('***') : s)
const clauses = segmentText('1. Billing. Your subscription renews automatically every month until you cancel. All payments are non-refundable.')
const nonce = makeNonce()
const runner = createPageAgentRunner({ baseURL: LLM_BASE_URL, model: LLM_MODEL, apiKey: LLM_API_KEY, maxRetries: 0 })
try {
  const res = await runner({ system: buildSystemPrompt(nonce), user: buildUserMessage({ nonce, url: 'https://example.test/terms', title: 'Terms', clauses, part: 1, parts: 1 }) })
  const v = validateChunkOutput(res.raw, buildClauseIndex(clauses))
  console.log(`✓ ${LLM_MODEL} @ ${new URL(LLM_BASE_URL).host}: tool-call alındı · şema ${res.passedToolSchema ? 'geçti' : 'GEÇMEDİ'} · ${v.findings.length} doğrulanmış bulgu · ${v.rejected.length} ret`)
} catch (err) {
  const e = err as { message?: string; type?: string; rawError?: unknown }
  console.error(`✗ LLM isteği başarısız (${e.type ?? 'hata'}): ${mask(String(e.message ?? err))}`)
  const raw = e.rawError as { cause?: { message?: string } } | undefined
  if (raw?.cause?.message) console.error(`  neden: ${mask(raw.cause.message)}`)
  else if (raw) console.error(mask(JSON.stringify(raw).slice(0, 600)))
  process.exit(1)
}
