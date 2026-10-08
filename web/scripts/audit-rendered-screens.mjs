// Rendered loop-screen audit (SSL-423/430). Headless Chrome (macOS path) against a running dev server.
// Usage: node scripts/audit-rendered-screens.mjs <width> <height> <tag> <presetKey...>
// Flags per screen: dark panels, orange/purple hues, text under 14px, taps under 44px, contrast under 4.5:1.
// Writes /tmp/audit-<tag>.json and a screenshot per preset. One preset per run is most reliable.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const [w = '390', h = '844', tag = 'p', ...presets] = process.argv.slice(2)
const C = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9300 + Math.floor(Math.random() * 500)
const p = spawn(C, ['--headless=new', `--remote-debugging-port=${port}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=/tmp/landnam-audit-prof' + port, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let tabs
for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find(t => t.type === 'page')) break } catch {} await sleep(250) }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let id = 0; const pend = {}
ws.onmessage = e => { const m = JSON.parse(e.data); pend[m.id]?.(m.result) }
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: true })

const AUDIT = `(() => {
  const parse = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r,g,b,a=1] = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return {r,g,b,a} }
  const hsl = ({r,g,b}) => { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, d=mx-mn; let hh=0, s=0
    if (d) { s = d/(1-Math.abs(2*l-1)); hh = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; hh*=60; if (hh<0) hh+=360 } return {h:hh,s,l} }
  const lum = ({r,g,b}) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4) }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
  const ratio = (a,b) => { const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05) }
  const bad = (c, what) => { if (!c || c.a < 0.3) return null; const k = hsl(c); if (k.s < 0.22 || k.l < 0.08 || k.l > 0.95) return null
    if (k.h >= 12 && k.h <= 48) return what+':orange'; if (k.h >= 262 && k.h <= 335) return what+':purple'; return null }
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.85) return c } return {r:255,g:255,b:255,a:1} }
  const out = { dark: [], hue: [], small: [], taps: [], contrast: [], panels: [] }
  const ovRoot = document.querySelector('nextjs-portal')?.shadowRoot; const ovClone = ovRoot ? [...ovRoot.children].filter(n => n.tagName !== 'STYLE').map(n => n.textContent).join(' ') : ''; const overlay = ovClone
  if (/Build Error|Runtime Error|Parsing CSS/.test(overlay)) return JSON.stringify({ error: 'Next error overlay: ' + overlay.replace(/\\s+/g, ' ').slice(0, 240) })
  const seen = new Set()
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight*3 }
  const name = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' < ' + (el.parentElement && typeof el.parentElement.className === 'string' ? el.parentElement.className.trim().split(/\\s+/).join('.') : '') + ':' + (el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,28).replace(/\\s+/g,' '))
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue
    const s = getComputedStyle(el), r = el.getBoundingClientRect()
    const bg = parse(s.backgroundColor)
    if (bg && bg.a > 0.6 && r.width*r.height > 6000) { const k = hsl(bg); if (k.l < 0.45) out.dark.push(name(el)+' '+s.backgroundColor); const hb = bad(bg,'bg'); if (hb) out.hue.push(hb+' '+name(el)+' '+s.backgroundColor)
      if (k.h >= 25 && k.h <= 60 && k.s > 0.12 && k.l > 0.8 && k.l < 0.97) out.dark.push('cream '+name(el)+' '+s.backgroundColor) }
    if (bg && bg.a > 0.85 && r.width*r.height > 9000 && r.width < innerWidth*0.98 && r.height < innerHeight*0.9 && s.position !== 'static' || (bg && bg.a > 0.85 && r.width*r.height > 9000 && r.width < innerWidth*0.98 && r.height < innerHeight*0.9 && s.borderRadius !== '0px')) { const bw = parseFloat(s.borderTopWidth), sh = s.boxShadow !== 'none' && s.boxShadow.replace(/rgba?\\([^)]*\\)/g,'').split(',').some(part => { const n = (part.match(/-?[\\d.]+px/g)||[]).map(parseFloat); return n.length >= 2 && (n[0] !== 0 || n[1] !== 0) }); if (bw < 1.9 || !sh) out.panels.push((bw<1.9?'border '+bw+'px ':'')+(sh?'':'no-offset-shadow ')+name(el)) }
    for (const [prop,label] of [['color','text'],['borderTopColor','border'],['fill','fill'],['stroke','stroke']]) { const hv = bad(parse(s[prop]), label); if (hv && (label==='text' ? el.childNodes.length && [...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) : label==='border' ? parseFloat(s.borderTopWidth)>0 : el instanceof SVGElement)) out.hue.push(hv+' '+name(el)+' '+s[prop]) }
    const own = [...el.childNodes].filter(n => n.nodeType===3 && n.textContent.trim()).map(n=>n.textContent.trim()).join(' ')
    if (own) {
      const fs = parseFloat(s.fontSize); if (fs < 13.9) out.small.push(fs.toFixed(1)+'px '+name(el))
      const fg = parse(s.color); if (fg) { const cr = ratio(fg, bgOf(el)); const big = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700); if (cr < (big ? 3 : 4.5) && !el.closest('canvas')) out.contrast.push(cr.toFixed(2)+' '+name(el)+' '+s.color) }
    }
    if (el.matches('button,a[href],[role=button],input,select,summary') && (r.width < 43.5 || r.height < 43.5) && r.width > 0) out.taps.push(Math.round(r.width)+'x'+Math.round(r.height)+' '+name(el))
  }
  for (const k in out) out[k] = [...new Set(out[k])]
  return JSON.stringify(out)
})()`

const report = {}
for (const pr of presets) {
  // Default: the isolated stage (one screen, fixture state, no loop). LANDNAM_STAGE=0 audits the full game shell.
  // LANDNAM_PATCH='{"francs":0}' shallow-merges into the player. Waits for the stage to report ready instead of a fixed sleep.
  const stage = process.env.LANDNAM_STAGE !== '0'
  const chrome = process.env.LANDNAM_CHROME ? '&chrome=1' : ''
  const patch = (process.env.LANDNAM_PATCH ? `&patch=${encodeURIComponent(process.env.LANDNAM_PATCH)}` : '') + chrome
  await send('Page.navigate', { url: stage ? `http://localhost:3001/game/stage?preset=${pr}${patch}` : `http://localhost:3001/game?preset=${pr}` })
  if (stage) {
    for (let i = 0; i < 60; i++) { const t = await send('Runtime.evaluate', { expression: `document.querySelector('[data-stage-ready=true] .game-screen-area')?.children.length > 0`, returnByValue: true }); if (t.result?.value) break; await sleep(250) }
    await sleep(+(process.env.LANDNAM_SETTLE ?? 4000))
  } else await sleep(11000)
  const r = await send('Runtime.evaluate', { expression: AUDIT, returnByValue: true })
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`/tmp/audit-${tag}-${pr}.png`, Buffer.from(shot.data, 'base64'))
  try { report[pr] = JSON.parse(r.result.value) } catch { report[pr] = { error: JSON.stringify(r) } }
}
writeFileSync(`/tmp/audit-${tag}.json`, JSON.stringify(report, null, 1))
console.log('done', Object.keys(report).join(','))
ws.close(); p.kill()
