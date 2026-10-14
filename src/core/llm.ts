import { InvokeError, InvokeErrorTypes, LLM, type Message, type Tool } from '@page-agent/llms'
import { LlmChunkReportSchema } from './schema'
import { TOOL_NAME } from './prompt'

export interface LlmSettings {
  baseURL: string
  model: string
  apiKey: string
  /** Bazı modeller temperature parametresini reddeder; sadece açıkça verilirse gönderilir. */
  temperature?: number
  maxRetries?: number
  /** Geçici hatalarda (429/5xx/ağ) üstel bekleme ile ek deneme sayısı. */
  transientRetries?: number
  /** İlk bekleme (ms); her denemede iki katına çıkar. */
  backoffMs?: number
}

const TRANSIENT = new Set<string>([InvokeErrorTypes.RATE_LIMIT, InvokeErrorTypes.SERVER_ERROR, InvokeErrorTypes.NETWORK_ERROR])

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    })
  })
}

/** Sağlayıcının hata gövdesindeki açıklama (ör. hangi kotanın aşıldığı). */
export function providerMessage(err: InvokeError): string {
  const raw = err.rawError as any
  const body = Array.isArray(raw) ? raw[0] : raw
  return String(body?.error?.message ?? '').replace(/\s+/g, ' ').slice(0, 300)
}

/** Google RetryInfo.retryDelay ("37s") veya mesajdaki "retry in 12.3s" bilgisinden bekleme süresi. */
export function suggestedDelayMs(err: InvokeError): number {
  const raw = err.rawError as any
  const body = Array.isArray(raw) ? raw[0] : raw
  for (const d of body?.error?.details ?? []) {
    const m = /^(\d+(?:\.\d+)?)s$/.exec(String(d?.retryDelay ?? ''))
    if (m) return Math.ceil(Number(m[1]) * 1000) + 500
  }
  const m = /retry in (?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)\s*s/i.exec(String(body?.error?.message ?? ''))
  return m ? Math.ceil(((Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 + Number(m[3])) * 1000) + 500 : 0
}

export function isGeminiCompat(baseURL: string): boolean {
  return /generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/.test(baseURL)
}

/**
 * JSON Schema'yı Gemini'nin zorunlu tool_choice ile kabul ettiği sade alt kümeye indirir:
 * yalnızca type / properties / items / required / enum / description kalır.
 * (Teşhis: gemini-3.8-flash, tool_choice "required" + pattern/minLength/maxLength birlikteyken
 * 400 INVALID_ARGUMENT döndürüyor.) Kaldırılan kısıtların hepsi deterministik doğrulayıcıda
 * zod ile aynen uygulanır; yani güvenlik kaybı yoktur.
 */
const GEMINI_SCHEMA_KEYS = new Set(['type', 'properties', 'items', 'required', 'enum', 'description'])
function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported)
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === 'properties' && v && typeof v === 'object') {
      out[k] = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, stripUnsupported(pv)]))
    } else if (GEMINI_SCHEMA_KEYS.has(k)) out[k] = stripUnsupported(v)
  }
  return out
}

/**
 * Gemini'nin OpenAI uyumlu uç noktası için istek gövdesini uyarlar:
 *  - araç şeması sade alt kümeye indirilir (bkz. stripUnsupported),
 *  - tek araç olduğundan isimli tool_choice, eşdeğeri olan "required"a çevrilir.
 */
export function toGeminiCompat(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body }
  if (Array.isArray(out.tools)) {
    out.tools = (out.tools as { function?: { parameters?: unknown } }[]).map((t) =>
      t.function ? { ...t, function: { ...t.function, parameters: stripUnsupported(t.function.parameters) } } : t,
    )
  }
  if (out.tool_choice && typeof out.tool_choice === 'object') out.tool_choice = 'required'
  return out
}

export interface ChunkCall {
  system: string
  user: string
}

export interface ChunkCallResult {
  /** Modelin araç çağrısındaki ham argümanlar (doğrulanmamış). */
  raw: unknown
  /** page-agent'in zod kontrolünden geçti mi? (geçmese bile ham çıktı deterministik doğrulamaya gider) */
  passedToolSchema: boolean
  usage?: { promptTokens: number; completionTokens: number }
}

export type ChunkRunner = (call: ChunkCall, signal?: AbortSignal) => Promise<ChunkCallResult>

/**
 * page-agent'in LLM istemcisi (@page-agent/llms) ile tek bir "tool call" yapar.
 * Model serbest metin döndüremez: tool_choice ile `submit_risk_report` çağırmaya zorlanır,
 * argümanlar zod şemasından üretilen JSON şemasına göre üretilir.
 * Aracın `execute` fonksiyonu yan etkisizdir (argümanı aynen döndürür) — modelin
 * sayfada veya tarayıcıda işlem yapabileceği hiçbir araç yoktur.
 */
export function createPageAgentRunner(settings: LlmSettings, customFetch?: typeof fetch): ChunkRunner {
  const llm = new LLM({
    baseURL: settings.baseURL.replace(/\/+$/, ''),
    model: settings.model,
    apiKey: settings.apiKey,
    maxRetries: settings.maxRetries ?? 1,
    customFetch: customFetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args)),
    transformRequestBody: (body) => {
      const out: Record<string, unknown> = isGeminiCompat(settings.baseURL) ? toGeminiCompat(body) : { ...body }
      if (settings.temperature !== undefined) out.temperature = settings.temperature
      return out
    },
  })
  const tools: Record<string, Tool> = {
    [TOOL_NAME]: {
      description: 'Submit the extracted risky clauses. Must be called exactly once.',
      inputSchema: LlmChunkReportSchema,
      execute: async (args) => args,
    },
  }

  return async (call, signal) => {
    const messages: Message[] = [
      { role: 'system', content: call.system },
      { role: 'user', content: call.user },
    ]
    const retries = settings.transientRetries ?? 6
    for (let attempt = 0; ; attempt++) {
      try {
        return await invokeOnce(messages, signal)
      } catch (err) {
        // Sağlayıcı yoğunluğu (503), hız sınırı (429) ve ağ hataları geçicidir: üstel bekle;
        // sağlayıcı bir bekleme süresi önerdiyse (retryDelay / Retry-After) ona uy.
        if (!(err instanceof InvokeError) || !TRANSIENT.has(err.type) || attempt >= retries) {
          if (err instanceof InvokeError) {
            const detail = providerMessage(err)
            if (detail && !err.message.includes(detail)) err.message = `${err.message} — ${detail}`
          }
          throw err
        }
        const backoff = (settings.backoffMs ?? 2000) * 2 ** attempt
        const suggested = suggestedDelayMs(err)
        if (suggested > 120_000) {
          // Günlük kota gibi uzun beklemeler: denemeye devam etmek kotayı daha da tüketir.
          err.message = `${err.message} — ${providerMessage(err)}`
          throw err
        }
        await sleep(Math.min(Math.max(backoff, suggested), 70_000), signal)
      }
    }
  }

  async function invokeOnce(messages: Message[], signal?: AbortSignal): Promise<ChunkCallResult> {
    try {
      const res = await llm.invoke(messages, tools, signal ?? new AbortController().signal, { toolChoiceName: TOOL_NAME })
      return {
        raw: res.toolCall.args,
        passedToolSchema: true,
        usage: { promptTokens: res.usage.promptTokens, completionTokens: res.usage.completionTokens },
      }
    } catch (err) {
      // Şemaya uymayan ama JSON olan çıktıyı kaybetme: deterministik doğrulayıcı
      // geçerli maddeleri tek tek kurtarır, geçersizleri gerekçesiyle reddeder.
      if (err instanceof InvokeError && err.type === InvokeErrorTypes.INVALID_TOOL_ARGS) {
        const args = (err.rawResponse as any)?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
        if (typeof args === 'string') {
          try {
            return { raw: JSON.parse(args), passedToolSchema: false }
          } catch {
            /* JSON bile değil → aşağıda fırlat */
          }
        }
      }
      throw err
    }
  }
}
