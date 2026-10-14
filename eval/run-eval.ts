/**
 * Mini eval: 6 gerçek ToS/gizlilik metni üzerinde yakalanan / kaçırılan / yanlış alarm.
 *
 *   npm run eval:rules                     # LLM'siz taban çizgisi (anahtar kelime kuralları)
 *   LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=… npm run eval:llm
 *                                          # tam sistem (page-agent LLM + doğrulayıcı); ham çıktılar eval/runs/<model>/ altına kaydedilir
 *   npm run eval:replay -- --run <model>   # kayıtlı ham LLM çıktılarını deterministik katmandan yeniden geçirir (anahtar gerekmez)
 *
 * Eşleştirme madde (clause) düzeyindedir: bir bulgu, altın etiketin çapa alıntılarından
 * birinin geçtiği maddeye düşerse "yakalandı" sayılır. "Kabul edilebilir" listesindeki
 * maddelere düşen bulgular nötrdür (ne doğru ne yanlış alarm). Ayrıntı: eval/GUIDELINES.md
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { analyzeDocument, type ChunkTrace, type ExtractedDocument } from '../src/core/pipeline'
import { createPageAgentRunner, type ChunkRunner } from '../src/core/llm'
import { runRules } from '../src/core/rules'
import { segmentText } from '../src/core/segment'
import { buildClauseIndex, verifyQuote } from '../src/core/validate'
import type { RiskReport } from '../src/core/schema'

type Mode = 'rules' | 'llm' | 'replay'

const args = process.argv.slice(2)
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const mode = (arg('mode') ?? 'rules') as Mode
const onlyDoc = arg('doc')

interface GoldItem {
  id: string
  category: string
  severity: string
  issue_tr: string
  anchors: string[]
}
interface Gold {
  doc: string
  items: GoldItem[]
  acceptable: { anchor: string; note: string }[]
}
interface SysFinding {
  clauseId: string
  category: string
  severity: string
  quote: string
}

function slug(s: string) {
  return s.replace(/[^a-z0-9.-]+/gi, '_').slice(0, 60)
}

async function loadDoc(id: string): Promise<ExtractedDocument> {
  return JSON.parse(await readFile(`eval/extracted/${id}.json`, 'utf8'))
}

function scoreDoc(doc: ExtractedDocument, gold: Gold, findings: SysFinding[]) {
  const clauses = segmentText(doc.text)
  const index = buildClauseIndex(clauses)
  const clauseOf = (q: string) => {
    const r = verifyQuote(index, '', q)
    if (!r.ok) throw new Error(`${gold.doc}: altın çapa metinde yok: ${q}`)
    return r.clauseId
  }
  const goldClauses = new Map<string, Set<string>>()
  for (const it of gold.items) goldClauses.set(it.id, new Set(it.anchors.map(clauseOf)))
  const acceptable = new Set(gold.acceptable.map((a) => clauseOf(a.anchor)))

  const caught = new Map<string, SysFinding[]>()
  const tp: (SysFinding & { gold: string[]; categoryOk: boolean })[] = []
  const neutral: SysFinding[] = []
  const fp: SysFinding[] = []
  for (const f of findings) {
    const hits = gold.items.filter((g) => goldClauses.get(g.id)!.has(f.clauseId))
    if (hits.length) {
      for (const g of hits) caught.set(g.id, [...(caught.get(g.id) ?? []), f])
      tp.push({ ...f, gold: hits.map((h) => h.id), categoryOk: hits.some((h) => h.category === f.category) })
    } else if (acceptable.has(f.clauseId)) neutral.push(f)
    else fp.push(f)
  }
  const missed = gold.items.filter((g) => !caught.has(g.id))
  const strictCaught = gold.items.filter((g) => (caught.get(g.id) ?? []).some((f) => f.category === g.category))
  const clauseText = new Map(clauses.map((c) => [c.id, c.text]))
  return {
    gold: gold.items.length,
    caught: [...caught.keys()],
    strictCaught: strictCaught.map((g) => g.id),
    missed,
    tp,
    neutral,
    fp,
    clauseText,
    precision: tp.length + fp.length ? tp.length / (tp.length + fp.length) : 1,
    recall: gold.items.length ? caught.size / gold.items.length : 1,
    strictRecall: gold.items.length ? strictCaught.length / gold.items.length : 1,
  }
}

function rulesFindings(doc: ExtractedDocument): SysFinding[] {
  const clauses = segmentText(doc.text)
  return runRules(clauses).map((h) => ({ clauseId: h.clauseId, category: h.category, severity: h.severity, quote: h.match }))
}

function replayRunner(trace: ChunkTrace[]): ChunkRunner {
  let i = 0
  return async () => {
    const t = trace[i++]
    if (!t || !t.ok || t.raw === undefined) throw new Error(t?.error ?? 'kayıtlı çıktı yok')
    return { raw: t.raw, passedToolSchema: t.passedToolSchema ?? true }
  }
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`
const cut = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s)

async function main() {
  const goldFiles = (await readdir('eval/gold')).filter((f) => f.endsWith('.json'))
  const golds: Gold[] = []
  for (const f of goldFiles) golds.push(JSON.parse(await readFile(`eval/gold/${f}`, 'utf8')))
  const selected = golds.filter((g) => !onlyDoc || g.doc === onlyDoc).sort((a, b) => a.doc.localeCompare(b.doc))

  let runName = 'rules-baseline'
  let runner: ChunkRunner | null = null
  const model = process.env.LLM_MODEL ?? arg('run') ?? ''
  if (mode === 'llm') {
    const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = process.env
    if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
      console.error('LLM modu için LLM_BASE_URL, LLM_MODEL ve LLM_API_KEY ortam değişkenleri gerekli.')
      process.exit(2)
    }
    runner = createPageAgentRunner({ baseURL: LLM_BASE_URL, model: LLM_MODEL, apiKey: LLM_API_KEY, temperature: process.env.LLM_TEMPERATURE ? Number(process.env.LLM_TEMPERATURE) : undefined })
    runName = `llm-${slug(LLM_MODEL)}`
  } else if (mode === 'replay') {
    if (!model) {
      console.error('--run <model-adı> gerekli (eval/runs/ altındaki klasör).')
      process.exit(2)
    }
    runName = `llm-${slug(model)}`
  }

  const outDir = `eval/results/${runName}`
  await mkdir(outDir, { recursive: true })
  const rows: string[] = []
  const details: string[] = []
  const json: Record<string, unknown> = {}
  let G = 0, C = 0, SC = 0, TP = 0, FP = 0, N = 0, REJ = 0

  for (const gold of selected) {
    const doc = await loadDoc(gold.doc)
    let findings: SysFinding[]
    let report: RiskReport | null = null
    if (mode === 'rules') {
      findings = rulesFindings(doc)
    } else {
      let trace: ChunkTrace[]
      if (mode === 'llm') {
        const res = await analyzeDocument(doc, {
          runner: runner!,
          model,
          concurrency: Number(process.env.LLM_CONCURRENCY ?? 1),
          maxChunkChars: process.env.LLM_MAX_CHUNK_CHARS ? Number(process.env.LLM_MAX_CHUNK_CHARS) : undefined,
        })
        report = res.report
        trace = res.trace
        await mkdir(`eval/runs/${slug(model)}`, { recursive: true })
        await writeFile(`eval/runs/${slug(model)}/${gold.doc}.json`, JSON.stringify({ model, createdAt: new Date().toISOString(), maxChunkChars: process.env.LLM_MAX_CHUNK_CHARS ? Number(process.env.LLM_MAX_CHUNK_CHARS) : undefined, trace }, null, 2))
      } else {
        const saved = JSON.parse(await readFile(`eval/runs/${slug(model)}/${gold.doc}.json`, 'utf8'))
        trace = saved.trace
        const res = await analyzeDocument(doc, {
          runner: replayRunner(trace),
          model,
          concurrency: 1,
          maxChunkChars: saved.maxChunkChars,
        })
        report = res.report
      }
      const failed = trace.filter((t) => !t.ok)
      for (const t of failed) console.error(`  ! ${gold.doc} parça ${t.part}: ${t.error ?? 'geçerli çıktı yok'}`)
      if (failed.length === trace.length) {
        console.error(`${gold.doc}: TÜM LLM çağrıları başarısız — sonuç yazılmadı (bu bir eval sonucu değildir).`)
        process.exit(1)
      }
      findings = report.findings.map((f) => ({ clauseId: f.clauseId, category: f.category, severity: f.severity, quote: f.quote }))
    }
    const s = scoreDoc(doc, gold, findings)
    const rejected = report ? report.rejected.filter((r) => r.code !== 'DUPLICATE') : []
    G += s.gold; C += s.caught.length; SC += s.strictCaught.length; TP += s.tp.length; FP += s.fp.length; N += s.neutral.length; REJ += rejected.length
    rows.push(`| ${gold.doc} | ${s.gold} | ${s.caught.length} | ${s.missed.length} | ${s.fp.length} | ${s.neutral.length} | ${pct(s.recall)} | ${pct(s.strictRecall)} | ${pct(s.precision)} |${report ? ` ${report.score} | ${report.confidence} | ${rejected.length} |` : ''}`)

    details.push(`\n## ${gold.doc}\n`)
    if (report) details.push(`Skor **${report.score}** (${report.scoreBand}) · rapor güveni **${report.confidence}** · ${report.coverage.analyzedClauses}/${report.coverage.totalClauses} madde · reddedilen iddia ${rejected.length} · belirsiz ${report.uncertain.length}\n`)
    details.push(`### ✅ Yakalanan (${s.caught.length}/${s.gold})\n`)
    for (const g of gold.items.filter((x) => s.caught.includes(x.id))) {
      const ok = s.strictCaught.includes(g.id) ? '' : ' ⚠️ kategori farklı'
      const f = s.tp.find((t) => t.gold.includes(g.id))!
      details.push(`- **${g.id}** \`${g.category}\` — ${g.issue_tr}${ok}  \n  ↳ sistem: \`${f.category}/${f.severity}\` [${f.clauseId}] “${cut(f.quote)}”`)
    }
    details.push(`\n### ❌ Kaçırılan (${s.missed.length})\n`)
    for (const g of s.missed) details.push(`- **${g.id}** \`${g.category}/${g.severity}\` — ${g.issue_tr}  \n  ↳ çapa: “${cut(g.anchors[0])}”`)
    if (!s.missed.length) details.push('- (yok)')
    details.push(`\n### ⚠️ Yanlış alarm (${s.fp.length})\n`)
    for (const f of s.fp) details.push(`- [${f.clauseId}] \`${f.category}/${f.severity}\` “${cut(f.quote)}”  \n  ↳ madde: ${cut(s.clauseText.get(f.clauseId) ?? '', 200)}`)
    if (!s.fp.length) details.push('- (yok)')
    if (rejected.length) {
      details.push(`\n### 🛡️ Doğrulayıcının reddettiği model iddiaları (${rejected.length})\n`)
      for (const r of rejected) details.push(`- \`${r.code}\` ${r.clauseId ?? ''} “${cut(r.quote ?? '', 140)}”`)
    }
    json[gold.doc] = {
      gold: s.gold,
      caught: s.caught,
      strictCaught: s.strictCaught,
      missed: s.missed.map((m) => m.id),
      falseAlarms: s.fp,
      neutral: s.neutral.length,
      precision: s.precision,
      recall: s.recall,
      report: report ? { score: report.score, confidence: report.confidence, rejected: rejected.length, uncertain: report.uncertain.length } : undefined,
    }
  }

  const precision = TP + FP ? TP / (TP + FP) : 1
  const recall = G ? C / G : 1
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  const llmCols = mode === 'rules' ? '' : ' Skor | Güven | Reddedilen |'
  const llmSep = mode === 'rules' ? '' : '---|---|---|'
  const md = `# Eval sonucu: ${runName}

Üretim: \`npm run eval${mode === 'rules' ? ':rules' : mode === 'llm' ? ':llm' : `:replay -- --run ${model}`}\` · ${new Date().toISOString().slice(0, 10)}

| Belge | Altın | Yakalanan | Kaçırılan | Yanlış alarm | Nötr | Recall | Recall (kategori dahil) | Precision |${llmCols}
|---|---|---|---|---|---|---|---|---|${llmSep}
${rows.join('\n')}
| **Toplam** | **${G}** | **${C}** | **${G - C}** | **${FP}** | ${N} | **${pct(recall)}** | **${pct(G ? SC / G : 1)}** | **${pct(precision)}** |${mode === 'rules' ? '' : ` | | ${REJ} |`}

F1 = ${f1.toFixed(2)}. Eşleştirme kuralları ve etiketleme yönergesi: [eval/GUIDELINES.md](../../GUIDELINES.md).
${details.join('\n')}
`
  await writeFile(`${outDir}/README.md`, md)
  await writeFile(`${outDir}/results.json`, JSON.stringify({ runName, precision, recall, f1, totals: { gold: G, caught: C, strictCaught: SC, tp: TP, fp: FP, neutral: N, rejected: REJ }, docs: json }, null, 2))
  console.log(md.split('\n').slice(0, 14).join('\n'))
  console.log(`\n→ ${outDir}/README.md`)
}

await main()
