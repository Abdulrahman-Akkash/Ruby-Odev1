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
    transformRequestBody:
      settings.temperature === undefined
        ? undefined
        : (body) => ({ ...body, temperature: settings.temperature }),
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
    const retries = settings.transientRetries ?? 4
    for (let attempt = 0; ; attempt++) {
      try {
        return await invokeOnce(messages, signal)
      } catch (err) {
        // Sağlayıcı yoğunluğu (503), hız sınırı (429) ve ağ hataları geçicidir: 2s, 4s, 8s, 16s bekle.
        if (!(err instanceof InvokeError) || !TRANSIENT.has(err.type) || attempt >= retries) throw err
        await sleep((settings.backoffMs ?? 2000) * 2 ** attempt, signal)
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
