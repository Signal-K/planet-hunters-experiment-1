#!/usr/bin/env node
/**
 * Play a scene by hand from the command line, with Liam watching. One browser
 * stays open between commands, so each command continues where the last one
 * left off, the way a person clicks through the game. Every action saves a
 * screenshot and prints its path plus any console errors it caused.
 *
 * This is for using the site, not for tests: no assertions, no scripted
 * flows, nothing to run in CI. See "Cloud sessions" in AGENTS.md.
 *
 *   node scripts/scene-drive.mjs open <scene-id|/route> [--size 926x428]   (phone landscape by default)
 *   node scripts/scene-drive.mjs look                 list the buttons and labels on screen
 *   node scripts/scene-drive.mjs click "<text>"       click a button or label by its text
 *   node scripts/scene-drive.mjs click css=<selector>
 *   node scripts/scene-drive.mjs tap <x> <y>          tap a point (canvas scenes)
 *   node scripts/scene-drive.mjs key <Key> [--hold <ms>]
 *   node scripts/scene-drive.mjs wait <ms>
 *   node scripts/scene-drive.mjs shot [--all]         screenshot now; --all = three viewports
 *   node scripts/scene-drive.mjs size <w>x<h>
 *   node scripts/scene-drive.mjs close
 *
 * Screenshots go to .scene-shots/ (gitignored).
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawn, spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = join(root, '.scene-shots')
const profileDir = join(root, '.scene-shots', '.browser')
const PORT = Number(process.env.SCENE_DRIVE_PORT ?? 9333)
const WEB = `http://localhost:${process.env.LANDNAM_WEB_PORT ?? 4320}`
const VIEWPORTS = { phone: [390, 844], landscape: [926, 428], desktop: [1440, 900] }

const require = createRequire(join(execFileSync('npm', ['root', '-g']).toString().trim(), 'noop.js'))
const { chromium } = require('playwright')

const [command, ...rest] = process.argv.slice(2)
const flag = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null }
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')))

// The browser runs in a detached `serve` process so it outlives each command.
if (command === 'serve') {
  const [w, h] = (flag('--size') ?? '926x428').split('x').map(Number)
  const context = await chromium.launchPersistentContext(profileDir, {
    viewport: { width: w, height: h },
    args: [`--remote-debugging-port=${PORT}`],
  })
  if (context.pages().length === 0) await context.newPage()
  await new Promise(() => {})
}

async function connect() {
  try {
    return await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  } catch {
    mkdirSync(shotsDir, { recursive: true })
    spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', '--size', flag('--size') ?? '926x428'], { detached: true, stdio: 'ignore' }).unref()
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250))
      try { return await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`) } catch {}
    }
    throw new Error('Browser did not start')
  }
}

function resolveRoute(target) {
  if (target.startsWith('/')) return target
  const registry = JSON.parse(readFileSync(join(root, 'qa', 'scenes.json'), 'utf8'))
  const entry = [...(registry.scenes ?? []), ...(registry.missions ?? [])].find(e => e.id === target)
  if (!entry) throw new Error(`Unknown scene "${target}". Run: node scripts/scene.mjs list`)
  return entry.web ? `/game/stage?preset=${encodeURIComponent(entry.web)}` : '/game/stage'
}

function nextShot(label) {
  mkdirSync(shotsDir, { recursive: true })
  const n = readdirSync(shotsDir).filter(f => /^\d{3}-/.test(f)).length + 1
  return join(shotsDir, `${String(n).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`)
}

async function settle(page) {
  if (page.url().includes('/game/stage')) await page.waitForSelector('[data-stage-ready="true"]', { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(600)
}

if (command === 'close') {
  try { const b = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`); await b.contexts()[0]?.close() } catch {}
  spawnSync('pkill', ['-f', 'scene-drive.mjs serve'])
  console.log('closed')
  process.exit(0)
}

if (!command || command === 'help') {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
  process.exit(0)
}

if (command === 'open') {
  const ensure = spawnSync(join(root, 'scripts', 'ensure-stack.sh'), { stdio: 'inherit' })
  if (ensure.status !== 0) process.exit(ensure.status ?? 1)
}

const browser = await connect()
const page = browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push(String(e)))

let label = command
switch (command) {
  case 'open': {
    const size = flag('--size')
    if (size) { const [w, h] = size.split('x').map(Number); await page.setViewportSize({ width: w, height: h }) }
    const route = resolveRoute(positional[0] ?? '/game/stage')
    await page.goto(WEB + route, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    label = `open-${positional[0]}`
    break
  }
  case 'click': {
    const target = positional.join(' ')
    const locator = target.startsWith('css=')
      ? page.locator(target.slice(4))
      : page.getByRole('button', { name: target, exact: false }).or(page.getByText(target, { exact: false }))
    await locator.first().click({ timeout: 10_000 })
    label = `click-${target}`
    break
  }
  case 'tap': {
    const [x, y] = positional.map(Number)
    await page.mouse.click(x, y)
    label = `tap-${x}-${y}`
    break
  }
  case 'key': {
    const hold = Number(flag('--hold') ?? 0)
    if (hold > 0) { await page.keyboard.down(positional[0]); await page.waitForTimeout(hold); await page.keyboard.up(positional[0]) }
    else await page.keyboard.press(positional[0])
    label = `key-${positional[0]}`
    break
  }
  case 'wait':
    await page.waitForTimeout(Number(positional[0] ?? 1000))
    label = `wait-${positional[0]}`
    break
  case 'size': {
    const [w, h] = (VIEWPORTS[positional[0]] ?? positional[0].split('x').map(Number))
    await page.setViewportSize({ width: w, height: h })
    label = `size-${w}x${h}`
    break
  }
  case 'look': {
    const items = await page.locator('button, a, [role="button"], h1, h2, h3, [data-testid]').evaluateAll(els => els
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight })
      .map(e => { const r = e.getBoundingClientRect(); const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50); return `${e.tagName.toLowerCase()}${e.dataset.testid ? `[${e.dataset.testid}]` : ''} "${t}" @${Math.round(r.x + r.width / 2)},${Math.round(r.y + r.height / 2)}` })
      .filter(s => !s.includes('""') || s.includes('[')))
    console.log(`url ${page.url().replace(WEB, '')}`)
    console.log([...new Set(items)].join('\n'))
    break
  }
  case 'shot':
    break
  default:
    console.error(`Unknown command "${command}". Run: node scripts/scene-drive.mjs help`)
    process.exit(2)
}

if (command !== 'look') {
  await settle(page)
  if (command === 'shot' && rest.includes('--all')) {
    const original = page.viewportSize()
    for (const [name, [w, h]] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize({ width: w, height: h })
      await settle(page)
      const file = nextShot(`${name}-${w}x${h}`)
      await page.screenshot({ path: file })
      console.log(file)
    }
    if (original) await page.setViewportSize(original)
  } else {
    const file = nextShot(label)
    await page.screenshot({ path: file })
    console.log(file)
  }
}
if (errors.length) console.log(`console errors:\n${errors.slice(0, 5).join('\n')}`)
if (command !== 'look') {
  // Fields for the Scene Monitor step row (AGENTS.md, Cloud sessions); add caption and image.
  const at = new Date().toISOString()
  const vp = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  const scene = new URL(page.url()).searchParams.get('preset') ?? new URL(page.url()).pathname
  console.log('monitor ' + JSON.stringify({ doc_id: at.replace(/[-:.]/g, ''), at, scene, action: [command, ...rest].join(' '), viewport: vp ? `${vp.width}x${vp.height}` : '', errors: errors.slice(0, 5) }))
}
await browser.close() // disconnects; the served browser keeps running
