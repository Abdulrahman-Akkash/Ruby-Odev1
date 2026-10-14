/**
 * Cypress fixture'larını GERÇEK model çıktılarıyla değiştirir.
 *   LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=… npm run record:fixtures
 * Her demo sayfası (eval/extracted/<id>.json — uzantının page-agent çıkarımı) için
 * pipeline çalıştırılır ve modelin ham tool-call argümanları parça parça kaydedilir.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { analyzeDocument } from '../src/core/pipeline'
import { createPageAgentRunner, type ChunkRunner } from '../src/core/llm'

const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = process.env
if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
  console.error('LLM_BASE_URL, LLM_MODEL ve LLM_API_KEY gerekli.')
  process.exit(2)
}
const real = createPageAgentRunner({ baseURL: LLM_BASE_URL, model: LLM_MODEL, apiKey: LLM_API_KEY })
for (const id of ['netflix-tos', 'ambiguous-terms', 'injection-terms']) {
  const doc = JSON.parse(await readFile(`eval/extracted/${id}.json`, 'utf8'))
  const parts: unknown[] = []
  const recording: ChunkRunner = async (call, signal) => {
    const part = Number(/This is part (\d+) of/.exec(call.user)?.[1] ?? 1)
    const res = await real(call, signal)
    parts[part - 1] = res.raw
    return res
  }
  const { report } = await analyzeDocument(doc, { runner: recording, model: LLM_MODEL, concurrency: 1 })
  await writeFile(
    `cypress/fixtures/llm/${id}.json`,
    JSON.stringify({ _kaynak: `KAYDEDİLMİŞ GERÇEK model çıktısı: ${LLM_MODEL} · ${new Date().toISOString()}`, parts }, null, 2),
  )
  console.log(id, `skor ${report.score}`, `bulgu ${report.findings.length}`, `reddedilen ${report.rejected.length}`, `güven ${report.confidence}`)
}
