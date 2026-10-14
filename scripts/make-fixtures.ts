// eval/corpus/*.md → harness/fixtures/*.html (gerçek metinlerden web sayfası üretir)
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { markdownToHtml } from './lib/md'

const sources = JSON.parse(await readFile('eval/corpus/sources.json', 'utf8')) as Record<string, { title: string }>
await mkdir('harness/fixtures', { recursive: true })
for (const f of await readdir('eval/corpus')) {
  if (!f.endsWith('.md')) continue
  const id = f.replace(/\.md$/, '')
  const md = await readFile(`eval/corpus/${f}`, 'utf8')
  await writeFile(`harness/fixtures/${id}.html`, markdownToHtml(md, sources[id]?.title ?? id))
  console.log('fixture', id)
}
