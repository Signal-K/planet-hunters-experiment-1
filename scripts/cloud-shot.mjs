#!/usr/bin/env node
/**
 * Cloud sessions only: screenshot one scene so the user can see it. A cloud
 * container has no Simple Browser, so this is the visual check there (see
 * "Cloud sessions" in AGENTS.md). It uses the Chromium the container already
 * has; the repository gains no browser dependency and it refuses to run
 * outside a cloud session.
 *
 * Usage:
 *   node scripts/cloud-shot.mjs <scene-id> [--all] [--preset <fixture>] [--label <name>]
 *   node scripts/cloud-shot.mjs /game/stage?preset=m1-mining [--all]
 *
 * Phone portrait by default; --all adds phone landscape and desktop.
 * Writes .scene-shots/<label>-<w>x<h>.png and prints each path.
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

if (process.env.CLAUDE_CODE_REMOTE !== 'true') {
  console.error('cloud-shot is for cloud sessions. Locally, use the Simple Browser and scripts/scene.mjs --check.')
  process.exit(2)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const target = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--preset' && args[args.indexOf(a) - 1] !== '--label')
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
if (!target) {
  console.error('Usage: node scripts/cloud-shot.mjs <scene-id|/route> [--all] [--preset <fixture>] [--label <name>]')
  process.exit(2)
}

let route = target
if (!target.startsWith('/')) {
  const registry = JSON.parse(readFileSync(join(root, 'qa', 'scenes.json'), 'utf8'))
  const entry = [...(registry.scenes ?? []), ...(registry.missions ?? [])].find(e => e.id === target)
  if (!entry) {
    console.error(`Unknown scene "${target}". Run: node scripts/scene.mjs list`)
    process.exit(2)
  }
  const preset = flag('--preset') ?? entry.web
  route = preset ? `/game/stage?preset=${encodeURIComponent(preset)}` : '/game/stage'
}

const ensure = spawnSync(join(root, 'scripts', 'ensure-stack.sh'), { stdio: 'inherit' })
if (ensure.status !== 0) process.exit(ensure.status ?? 1)

const require = createRequire(join(execFileSync('npm', ['root', '-g']).toString().trim(), 'noop.js'))
const { chromium } = require('playwright')

const viewports = args.includes('--all') ? [[390, 844], [926, 428], [1440, 900]] : [[390, 844]]
const label = flag('--label') ?? target.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')
const outDir = join(root, '.scene-shots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`http://localhost:${process.env.LANDNAM_WEB_PORT ?? 4320}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    if (route.startsWith('/game/stage')) await page.waitForSelector('[data-stage-ready="true"]', { timeout: 60_000 })
    else await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(1500) // let the scene's entry animation settle
    const file = join(outDir, `${label}-${width}x${height}.png`)
    await page.screenshot({ path: file })
    console.log(file)
    await page.close()
  }
} finally {
  await browser.close()
}
