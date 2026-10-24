#!/usr/bin/env node
/**
 * Open or verify one authored scene without a browser runner.
 *
 * Usage:
 *   node scripts/scene.mjs list
 *   node scripts/scene.mjs mining
 *   node scripts/scene.mjs mining --check
 *
 * `--check` sends the selected stage to the Cursor/VS Code Simple Browser and
 * waits for its dev bridge to report that the independent scene mounted.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(root, 'qa', 'scenes.json'), 'utf8'))
const [name, ...flags] = process.argv.slice(2)

if (!name || name === 'list') {
  for (const scene of registry.scenes) {
    console.log(`${scene.id.padEnd(22)} ${scene.web ?? '-'}${scene.native ? `  iOS:${scene.native}` : ''}`)
  }
  process.exit(0)
}

const scene = registry.scenes.find((entry) => entry.id === name)
if (!scene) {
  console.error(`Unknown scene "${name}". Run: node scripts/scene.mjs list`)
  process.exit(2)
}

const route = scene.web ? `/game/stage?preset=${encodeURIComponent(scene.web)}` : `/game/stage`
const open = spawnSync(process.execPath, [join(root, 'scripts', 'preview-target.mjs'), route], { stdio: 'inherit' })
if (open.status !== 0) process.exit(open.status ?? 1)

console.log(`web: http://localhost:4320${route}&follow=1`)
if (scene.native) console.log(`iOS Simulator: xcrun simctl launch booted com.atlasskyventures.sslandnam -scene ${scene.native}`)

if (flags.includes('--check')) {
  const check = spawnSync(process.execPath, [join(root, 'scripts', 'dev-check.mjs'), '--route', route, '--see', '[data-stage-ready="true"]'], { stdio: 'inherit' })
  process.exit(check.status ?? 1)
}
