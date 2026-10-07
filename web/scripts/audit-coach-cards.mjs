// Coach-card audit (SSL-429). Headless Chrome (macOS path) against a running dev server.
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


// Coach-card audit (SSL-429): open help, run "Show me", and on every step check the hint card
// never overlaps the lit controls, stays inside the viewport, and its buttons are 44px.
const STEP = `(() => {
  const hint = document.querySelector('[data-testid="help-coach-hint"]'); const root = document.querySelector('[data-testid="help-coach"]')
  if (!hint) return JSON.stringify({ none: true })
  const h = hint.getBoundingClientRect(), id = root.dataset.coachStep
  const ids = [...document.querySelectorAll('[data-coach-target]')].filter(e => (root.dataset.coachStep, true))
  const hole = root.querySelector('[aria-hidden]').getBoundingClientRect()
  const hit = !(h.right <= hole.left || h.left >= hole.right || h.bottom <= hole.top || h.top >= hole.bottom)
  const btns = [...hint.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height) })
  return JSON.stringify({ id, overlap: hit, offscreen: h.left < 0 || h.top < 0 || h.right > innerWidth || h.bottom > innerHeight, btns, small: btns.filter(x => x.split('x').some(n => +n < 43.5)), hint: [Math.round(h.left),Math.round(h.top),Math.round(h.width),Math.round(h.height)], hole: [Math.round(hole.left),Math.round(hole.top),Math.round(hole.width),Math.round(hole.height)] })
})()`
const click = sel => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'missing'; b.click(); return 'ok' })()`
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value
const report = {}
for (const pr of presets) {
  await send('Page.navigate', { url: `http://localhost:3001/game?preset=${pr}` })
  await sleep(11000)
  const r = { open: await ev(click('[data-testid="help-button"],[aria-label="Help"]')) }
  await sleep(600)
  r.show = await ev(click('[data-testid="help-show-me"]'))
  r.steps = []
  for (let i = 0; i < 8; i++) {
    await sleep(700)
    const v = JSON.parse(await ev(STEP)); if (v.none) break
    r.steps.push(v)
    if (i === 0) writeFileSync(`/tmp/coach-${tag}-${pr}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    await ev(click('[data-testid="help-coach-next"]'))
  }
  report[pr] = r
}
writeFileSync(`/tmp/coach-${tag}.json`, JSON.stringify(report, null, 1))
console.log('done'); ws.close(); p.kill()
