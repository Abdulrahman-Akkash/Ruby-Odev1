/**
 * Eval korpusundaki (OpenTermsArchive / GitHub site-policy / Basecamp) markdown
 * dosyalarını, gerçek bir web sayfasına benzeyen HTML'e çevirir. Böylece eval,
 * uzantının kullandığı page-agent çıkarıcısını gerçek tarayıcıda çalıştırabilir.
 * Bilerek basit: başlık, paragraf, liste, tablo satırı, bağlantı, kalın/italik.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(s: string): string {
  let out = esc(s.replace(/\\([\\`*_{}\[\]()#+\-.!>|])/g, '$1'))
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[\]\([^)]*\)/g, '')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, '<a href="$2">$1</a>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>').replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  return out
}

export function markdownToHtml(md: string, title: string): string {
  const src = md
    .replace(/^---\n[\s\S]*?\n---\n/, '') // front matter
    .replace(/<!--[\s\S]*?-->/g, '') // HTML yorumları tarayıcıda görünmez
  const lines = src.split(/\r?\n/)
  const out: string[] = []
  let para: string[] = []
  let list: 'ul' | 'ol' | null = null
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1] ?? ''
    if (/^\s*$/.test(line)) {
      flush()
      closeList()
      continue
    }
    if (/^\s*(=+|-+)\s*$/.test(next) && line.trim() && !/^\s*[-*]\s/.test(line)) {
      flush()
      closeList()
      out.push(`<h${next.trim().startsWith('=') ? 1 : 2}>${inline(line.trim())}</h${next.trim().startsWith('=') ? 1 : 2}>`)
      i++
      continue
    }
    const hm = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (hm) {
      flush()
      closeList()
      out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`)
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush()
      closeList()
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue
      const cells = line.trim().slice(1, -1).split('|').map((c) => `<td>${inline(c.trim())}</td>`)
      out.push(`<table><tr>${cells.join('')}</tr></table>`)
      continue
    }
    const lm = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (lm) {
      flush()
      const kind = /\d/.test(lm[1]) ? 'ol' : 'ul'
      if (list !== kind) {
        closeList()
        out.push(`<${kind}>`)
        list = kind
      }
      out.push(`<li>${inline(lm[2])}</li>`)
      continue
    }
    if (/^\s*>/.test(line)) {
      para.push(line.replace(/^\s*>\s?/, ''))
      continue
    }
    if (list && /^\s{2,}\S/.test(line)) {
      // liste öğesinin devamı
      out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(line.trim())}</li>`)
      continue
    }
    closeList()
    para.push(line.trim())
  }
  flush()
  closeList()
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:16px/1.6 Georgia,serif;max-width:760px;margin:0 auto;padding:24px;color:#222}nav,footer{font:13px system-ui;color:#555}nav a{margin-right:12px}</style>
</head><body>
<nav><a href="#">Home</a><a href="#">Help Center</a><a href="#">Sign In</a></nav>
<main>
${out.join('\n')}
</main>
<footer><a href="#">Privacy</a> · <a href="#">Cookie Preferences</a> · <a href="#">Contact</a></footer>
</body></html>`
}
