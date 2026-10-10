#!/usr/bin/env node
// SSL-507: turn Playwright output into one human-readable page.
// Reads tests/.out/results.json (JSON reporter) plus the screenshots under tests/.out and writes tests/.out/index.html:
// one row per screen x viewport with the screenshot, pass/fail and every violation the checks found.
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const out = new URL('../tests/.out/', import.meta.url).pathname
const resultsPath = join(out, 'results.json')
if (!existsSync(resultsPath)) { console.error(`missing ${resultsPath}; run playwright with the json reporter (CI=true)`); process.exit(1) }
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))

const pngs = new Map()
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith('.png') && pngs.set(f, relative(out, p)) } }
walk(out)

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const rows = []
const visit = (suite, path) => {
  const here = suite.title && !suite.title.endsWith('.ts') ? [...path, suite.title] : path
  for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
    const last = t.results.at(-1) ?? {}
    const vp = here.at(-1) ?? ''
    const name = spec.title.replace(/ (is sound|evidence)$/, '')
    const shot = pngs.get(`evidence-${name}-${vp}.png`) ?? pngs.get(`${name}-${vp}.png`)
    const violations = [...(t.annotations ?? []), ...(last.annotations ?? [])].filter(a => a.type === 'violation' || a.type === 'contrast-skip')
    rows.push({
      name, vp, shot, kind: spec.title.endsWith('evidence') ? 'evidence' : 'structural', status: t.status, ok: t.status === 'expected' || t.status === 'flaky',
      error: last.error?.message?.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 1500) ?? '',
      violations: violations.filter(a => a.type === 'violation').map(a => a.description),
      skips: [...new Set(violations.filter(a => a.type === 'contrast-skip').map(a => a.description))],
    })
  }
  for (const s of suite.suites ?? []) visit(s, here)
}
for (const s of results.suites ?? []) visit(s, [])
rows.sort((a, b) => a.name.localeCompare(b.name) || a.vp.localeCompare(b.vp))

const failed = rows.filter(r => !r.ok).length
const html = `<!doctype html><meta charset="utf-8"><title>Landnam scene evidence</title>
<style>body{font:14px system-ui;margin:16px;max-width:1200px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
img{max-height:260px;max-width:260px}.fail{background:#fde8e8}.pass{background:#eefaf0}code,pre{white-space:pre-wrap;word-break:break-word;font-size:12px}</style>
<h1>Scene evidence</h1><p>${rows.length} checks, ${failed} failing. Generated ${new Date().toISOString()}.</p>
<table><tr><th>Screen</th><th>Viewport</th><th>Screenshot</th><th>Result</th><th>Violations</th></tr>
${rows.map(r => `<tr class="${r.ok ? 'pass' : 'fail'}"><td>${esc(r.name)}<br><small>${r.kind}</small></td><td>${esc(r.vp)}</td>
<td>${r.shot ? `<a href="${esc(r.shot)}"><img loading="lazy" src="${esc(r.shot)}" alt="${esc(r.name)}"></a>` : 'no screenshot'}</td>
<td>${r.ok ? 'PASS' + (r.status === 'flaky' ? ' (flaky: needed retry)' : '') : 'FAIL'}</td>
<td>${r.violations.map(v => `<div>${esc(v)}</div>`).join('')}${r.error ? `<pre>${esc(r.error)}</pre>` : ''}${r.skips.length ? `<details><summary>contrast skipped</summary>${r.skips.map(s => `<div>${esc(s)}</div>`).join('')}</details>` : ''}${!r.violations.length && !r.error ? 'none' : ''}</td></tr>`).join('\n')}
</table>`
writeFileSync(join(out, 'index.html'), html)
console.log(`wrote ${join(out, 'index.html')} (${rows.length} rows, ${failed} failing, ${rows.filter(r => r.shot).length} screenshots)`)
