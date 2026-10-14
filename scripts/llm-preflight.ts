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
let captured: Record<string, unknown> | null = null
const capturingFetch: typeof fetch = (input, init) => {
  if (!captured && init?.body) captured = JSON.parse(String(init.body))
  return fetch(input, init)
}
const runner = createPageAgentRunner({ baseURL: LLM_BASE_URL, model: LLM_MODEL, apiKey: LLM_API_KEY, maxRetries: 0 }, capturingFetch)

/** 400 alındığında hangi alanın reddedildiğini bulmak için istek varyantlarını dener. */
async function diagnose(body: Record<string, unknown>) {
  const KEEP = new Set(['type', 'properties', 'items', 'required', 'enum', 'description'])
  const simplify = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(simplify)
    if (!n || typeof n !== 'object') return n
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(n)) {
      if (k === 'properties') o[k] = Object.fromEntries(Object.entries(v as object).map(([pk, pv]) => [pk, simplify(pv)]))
      else if (KEEP.has(k)) o[k] = simplify(v)
    }
    return o
  }
  const without = (b: Record<string, unknown>, ...keys: string[]) => Object.fromEntries(Object.entries(b).filter(([k]) => !keys.includes(k)))
  const simpleTools = (b: Record<string, unknown>) => ({
    ...b,
    tools: (b.tools as any[]).map((t) => ({ ...t, function: { ...t.function, parameters: simplify(t.function.parameters) } })),
  })
  const variants: [string, Record<string, unknown>][] = [
    ['olduğu gibi', body],
    ['reasoning_effort yok', without(body, 'reasoning_effort')],
    ['tool_choice yok', without(body, 'tool_choice')],
    ['reasoning_effort + tool_choice yok', without(body, 'reasoning_effort', 'tool_choice')],
    ['sade şema (pattern/min/max yok)', simpleTools(body)],
    ['sade şema + reasoning_effort/tool_choice yok', simpleTools(without(body, 'reasoning_effort', 'tool_choice'))],
    ['araçsız', without(body, 'tools', 'tool_choice')],
  ]
  console.error('\nTeşhis: istek varyantları')
  for (const [name, b] of variants) {
    let line = ''
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch(`${LLM_BASE_URL!.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${LLM_API_KEY}` },
        body: JSON.stringify(b),
      })
      const text = await r.text()
      line = `${r.status} ${mask(text.replace(/\s+/g, ' ').slice(0, 220))}`
      if (r.status !== 503 && r.status !== 429) break
      await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt))
    }
    console.error(`  [${name}] → ${line}`)
  }
  console.error(`  gövde anahtarları: ${Object.keys(body).join(', ')}`)
}
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
  if (/HTTP 400/.test(String(e.message)) && captured) await diagnose(captured)
  process.exit(1)
}
