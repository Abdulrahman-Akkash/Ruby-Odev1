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
