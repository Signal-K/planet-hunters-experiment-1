#!/usr/bin/env node
// Scene-based QA (web + native). Manifest: ../qa/scenes.json
//   node scripts/qa-scenes.mjs --list
//   node scripts/qa-scenes.mjs --flow core-loop [--vp ph,dk]    audit + screenshots for every web scene in the flow
//   node scripts/qa-scenes.mjs --scene launch-review            one scene
//   node scripts/qa-scenes.mjs --ticket SSL-426                 every scene tagged with a ticket
// Needs the dev server on :3001. Output: /tmp/landnam-qa/<run>/index.html contact sheet (web shots + native snapshots from SNAPSHOT_DIR) and report.md.
// Native: SNAPSHOT_DIR=/tmp/landnam-snap xcodebuild test -scheme Landnam -destination 'platform=iOS Simulator,name=iPhone 17 Pro' (from native/), then re-run here.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const M = JSON.parse(readFileSync(join(here, '../../qa/scenes.json'), 'utf8'))
const a = process.argv.slice(2), opt = k => { const i = a.indexOf('--' + k); return i < 0 ? null : (a[i + 1] ?? true) }
if (opt('list')) {
  for (const [f, d] of Object.entries(M.flows)) {
    console.log(`\n${f} — ${d}`)
    for (const s of M.scenes.filter(s => s.flow === f)) console.log(`  ${s.id.padEnd(18)} web:${(s.web || '-').padEnd(24)} native:${(s.native || '-').padEnd(26)} ${s.tickets.join(' ')}`)
  }
  process.exit(0)
}
const flow = opt('flow'), scene = opt('scene'), ticket = opt('ticket')
const picked = M.scenes.filter(s => (!flow || s.flow === flow) && (!scene || s.id === scene) && (!ticket || s.tickets.includes(ticket)))
if (!picked.length || !(flow || scene || ticket)) { console.error('Pick --flow, --scene or --ticket (or --list).'); process.exit(1) }
const vps = (opt('vp') || 'ph,dk').split(',')
const run = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const out = `/tmp/landnam-qa/${run}`; mkdirSync(out, { recursive: true })
const snap = process.env.SNAPSHOT_DIR || '/tmp/landnam-snap'
const rows = []
for (const s of picked) {
  const row = { s, shots: [], flags: [], native: null }
  if (s.web) for (const v of vps) {
    const [w, h] = M.viewports[v]; const tag = `qa-${run}-${v}-${s.id}`
    spawnSync('node', [join(here, 'audit-rendered-screens.mjs'), w, h, tag, s.web], { stdio: 'ignore' })
    const png = `/tmp/audit-${tag}-${s.web}.png`, js = `/tmp/audit-${tag}.json`
    if (existsSync(png)) { copyFileSync(png, `${out}/${s.id}-${v}.png`); row.shots.push([v, `${s.id}-${v}.png`]) }
    if (existsSync(js)) {
      const r = JSON.parse(readFileSync(js, 'utf8'))[s.web] || {}
      if (r.error) row.flags.push(`${v}: ${r.error}`)
      for (const k of ['small', 'taps', 'contrast', 'hue']) for (const e of r[k] || []) if (!/dev-shortcuts/.test(e)) row.flags.push(`${v} ${k}: ${e}`)
    } else row.flags.push(`${v}: audit produced nothing`)
  }
  if (s.native && existsSync(`${snap}/${s.native}.png`)) { copyFileSync(`${snap}/${s.native}.png`, `${out}/${s.id}-native.png`); row.native = `${s.id}-native.png` }
  rows.push(row); console.log(`${s.id}: ${row.flags.length ? row.flags.length + ' flags' : 'clean'}`)
}
const esc = t => String(t).replace(/</g, '&lt;')
writeFileSync(`${out}/index.html`, `<!doctype html><meta charset=utf-8><title>QA ${run}</title><style>body{font:14px system-ui;margin:16px;background:#f3f7fb;color:#0f2436}section{margin:0 0 28px}.g{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}img{max-height:520px;border:2px solid #0f2436;background:#fff}.f{color:#a11}</style>` +
  rows.map(r => `<section><h2>${r.s.name} <small>${r.s.flow} · ${r.s.tickets.join(' ')}</small></h2><div class=g>${r.shots.map(([v, f]) => `<figure><img src="${f}"><figcaption>web ${v}</figcaption></figure>`).join('')}${r.native ? `<figure><img src="${r.native}"><figcaption>native</figcaption></figure>` : ''}</div>${r.s.note ? `<p>${esc(r.s.note)}</p>` : ''}${r.flags.map(f => `<div class=f>${esc(f)}</div>`).join('')}</section>`).join(''))
writeFileSync(`${out}/report.md`, rows.map(r => `- ${r.s.id}: ${r.flags.length ? r.flags.join('; ') : 'clean'}`).join('\n'))
console.log(`\nContact sheet: ${out}/index.html`)
