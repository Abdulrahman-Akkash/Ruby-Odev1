// Uzantıyı ve Cypress test düzeneğini (harness) esbuild ile paketler.
import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'

const watch = process.argv.includes('--watch')
const common = {
  bundle: true,
  target: 'chrome120',
  sourcemap: 'linked',
  logLevel: 'info',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.css': 'text' },
}

await rm('dist', { recursive: true, force: true })
await mkdir('dist/extension', { recursive: true })
await cp('extension', 'dist/extension', { recursive: true })

await build({
  ...common,
  format: 'iife',
  entryPoints: {
    'content/extract': 'src/content/extract-entry.ts',
    'content/detector': 'src/content/detector.ts',
    'ui/sidepanel': 'src/ui/sidepanel.ts',
  },
  outdir: 'dist/extension',
})

await build({
  ...common,
  format: 'esm',
  entryPoints: { 'background/service-worker': 'src/background/service-worker.ts' },
  outdir: 'dist/extension',
})

// Cypress test düzeneği: uzantının AYNI UI + çıkarıcı + pipeline kodunu, chrome.* yerine
// küçük bir köprüyle normal bir web sayfasında çalıştırır.
await mkdir('dist/harness', { recursive: true })
await cp('harness', 'dist/harness', { recursive: true })
await cp('extension/ui', 'dist/harness/ui', { recursive: true })
const panelHtml = await readFile('extension/ui/sidepanel.html', 'utf8')
const panelBody = /<body>([\s\S]*)<\/body>/.exec(panelHtml)[1].replace(/<script[^>]*><\/script>/g, '')
const template = await readFile('harness/index.template.html', 'utf8')
await writeFile('dist/harness/index.html', template.replace('<!--PANEL-->', panelBody))
await rm('dist/harness/index.template.html')
await build({
  ...common,
  format: 'iife',
  entryPoints: {
    'harness-bridge': 'src/harness/bridge.ts',
    'ui/sidepanel': 'src/ui/sidepanel.ts',
    'content/extract': 'src/content/extract-entry.ts',
  },
  outdir: 'dist/harness',
})

if (watch) console.log('watch mode not implemented; re-run build')
