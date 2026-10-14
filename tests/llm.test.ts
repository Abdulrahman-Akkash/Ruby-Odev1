import { describe, expect, it } from 'vitest'
import { createPageAgentRunner } from '../src/core/llm'

const ok = {
  choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'submit_risk_report', arguments: JSON.stringify({ is_legal_text: true, injection_suspected: false, findings: [], uncertain: [] }) } }] } }],
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('createPageAgentRunner', () => {
  it('503 (sağlayıcı yoğunluğu) sonrası üstel beklemeyle yeniden dener', async () => {
    let calls = 0
    const fetchMock = (async () => (++calls <= 2 ? json(503, { error: { message: 'high demand' } }) : json(200, ok))) as typeof fetch
    const run = createPageAgentRunner({ baseURL: 'https://x.test/v1', model: 'm', apiKey: 'k', maxRetries: 0, backoffMs: 1 }, fetchMock)
    const res = await run({ system: 's', user: 'u' })
    expect(calls).toBe(3)
    expect(res.passedToolSchema).toBe(true)
  })
  it('401 gibi kalıcı hatada yeniden denemez', async () => {
    let calls = 0
    const fetchMock = (async () => (++calls, json(401, { error: { message: 'bad key' } }))) as typeof fetch
    const run = createPageAgentRunner({ baseURL: 'https://x.test/v1', model: 'm', apiKey: 'k', maxRetries: 0, backoffMs: 1 }, fetchMock)
    await expect(run({ system: 's', user: 'u' })).rejects.toThrow(/Authentication/)
    expect(calls).toBe(1)
  })
})

describe('Gemini uyumluluğu', () => {
  it('istek gövdesinde additionalProperties olmaz ve tool_choice "required" olur', async () => {
    let body: any
    const fetchMock = (async (_u: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return new Response(JSON.stringify(ok), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    const run = createPageAgentRunner({ baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-x', apiKey: 'k' }, fetchMock)
    await run({ system: 's', user: 'u' })
    const tools = JSON.stringify(body.tools)
    for (const k of ['additionalProperties', '"pattern"', 'maxLength', 'minLength', 'maxItems']) expect(tools).not.toContain(k)
    expect(body.tools[0].function.parameters.properties.findings.items.properties.category.enum).toContain('auto_renewal')
    expect(body.tool_choice).toBe('required')
    expect(body.tools[0].function.parameters.properties.findings.items.properties.quote).toBeTruthy()
  })
  it('OpenAI için gövde değişmez', async () => {
    let body: any
    const fetchMock = (async (_u: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return new Response(JSON.stringify(ok), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    await createPageAgentRunner({ baseURL: 'https://api.openai.com/v1', model: 'gpt-x', apiKey: 'k' }, fetchMock)({ system: 's', user: 'u' })
    expect(JSON.stringify(body.tools)).toContain('additionalProperties')
    expect(body.tool_choice).toMatchObject({ type: 'function' })
  })
})
