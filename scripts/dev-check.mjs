#!/usr/bin/env node
// Fast check inside the editor's Simple Browser (the tab that has ?follow=1 open). No browser install, no second stack.
//   node scripts/dev-check.mjs <name>          run a named check from scripts/checks.json
//   node scripts/dev-check.mjs --list
//   node scripts/dev-check.mjs --route /game/hub --see "SELL" --click "OPEN"   one-off
// The tab navigates, runs the steps, shows a PASS/FAIL banner and posts the result back here. Exit 0 = pass.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Keep the checker on the same IPv4 loopback address as the preview panel.
// On some editor hosts `localhost` resolves to IPv6 first while Next listens
// only on IPv4, producing a misleading "server is not answering" failure.
const base = process.env.LANDNAM_WEB_URL ?? `http://127.0.0.1:${process.env.LANDNAM_WEB_PORT ?? 4320}`
const checks = JSON.parse(readFileSync(join(root, 'scripts', 'checks.json'), 'utf8'))
const argv = process.argv.slice(2)
const flag = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1] }

if (argv.includes('--list')) { console.log(Object.keys(checks).join('\n')); process.exit(0) }

let name = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'adhoc'
let check = checks[name]
if (!check && flag('--route')) {
  const steps = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--click') steps.push({ click: argv[i + 1] })
    if (argv[i] === '--see') steps.push({ see: argv[i + 1] })
  }
  check = { route: flag('--route'), steps }
}
if (!check) { console.error(`No check "${name}". Try --list.`); process.exit(2) }

const post = (body) => fetch(`${base}/api/dev/follow`, { method: 'POST', body: JSON.stringify(body) })
let bridge
try { bridge = await (await fetch(`${base}/api/dev/follow`, { cache: 'no-store' })).json() } catch { console.error(`Dev server is not answering on ${base}. Run: make ensure`); process.exit(2) }
const followerDeadline = Date.now() + 7000
while (!(bridge?.follower?.seenAt > Date.now() - 7000) && Date.now() < followerDeadline) {
  await new Promise((resolve) => setTimeout(resolve, 400))
  bridge = await (await fetch(`${base}/api/dev/follow`, { cache: 'no-store' })).json().catch(() => null)
}
if (!(bridge?.follower?.seenAt > Date.now() - 7000)) {
  console.error('No live editor preview is registered. Run “Landnam Preview: Open” in Cursor/VS Code, then retry.')
  process.exit(2)
}

const id = `${name}-${Date.now().toString(36)}`
// Route first so the tab navigates, then the steps run once it has loaded.
// `fresh` reloads the page even when the tab is already on the route, so the check starts from the preset state.
const target = check.fresh ? `${check.route}${check.route.includes('?') ? '&' : '?'}t=${Date.now().toString(36)}` : check.route
await post({ actions: [], id: null })
const { spawnSync } = await import('node:child_process')
spawnSync(process.execPath, [join(root, 'scripts', 'preview-target.mjs'), target], { stdio: 'ignore' })
await post({ actions: check.steps, id })

const deadline = Date.now() + (check.timeout ?? 45_000)
let sawTab = false
while (Date.now() < deadline) {
  const res = await (await fetch(`${base}/api/dev/follow`)).json().catch(() => null)
  if (res?.result?.id === id) {
    const r = res.result
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${name} (${(r.ms / 1000).toFixed(1)}s, ${r.viewport}) ${r.ok ? '' : `step ${r.step}: ${r.detail}`}`)
    if (!r.ok) console.log(`page text: ${r.text}`)
    process.exit(r.ok ? 0 : 1)
  }
  await new Promise((r) => setTimeout(r, 400))
}
console.error(`TIMEOUT ${name}: the registered preview did not report a result. Open Landnam Preview status and reconnect the panel.`)
process.exit(3)
