#!/usr/bin/env node
/**
 * Open or verify one independent scene or mission without a browser runner.
 *
 * Usage:
 *   node scripts/scene.mjs list
 *   node scripts/scene.mjs mining
 *   node scripts/scene.mjs orionids-shower --check
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

const entries = [
  ...(registry.scenes ?? []).map(entry => ({ ...entry, kind: 'scene' })),
  ...(registry.missions ?? []).map(entry => ({ ...entry, kind: 'mission' })),
]

if (!name || name === 'list') {
  for (const entry of entries) {
    console.log(`${entry.kind.padEnd(7)} ${entry.id.padEnd(24)} ${entry.web ?? '-'}${entry.native ? `  iOS:${entry.native}` : ''}`)
  }
  process.exit(0)
}

const entry = entries.find(candidate => candidate.id === name)
if (!entry) {
  console.error(`Unknown scene "${name}". Run: node scripts/scene.mjs list`)
  process.exit(2)
}

const route = entry.web ? `/game/stage?preset=${encodeURIComponent(entry.web)}` : '/game/stage'
const open = spawnSync(process.execPath, [join(root, 'scripts', 'preview-target.mjs'), route], { stdio: 'inherit' })
if (open.status !== 0) process.exit(open.status ?? 1)

console.log(`web: http://localhost:4320${route}&follow=1`)
if (entry.native) console.log(`iOS Simulator: xcrun simctl launch booted com.atlasskyventures.sslandnam -scene ${entry.native}`)
if (entry.objective) console.log(`objective: ${entry.objective}`)
if (entry.complete) console.log(`complete: ${entry.complete}`)

if (flags.includes('--check')) {
  const check = spawnSync(process.execPath, [join(root, 'scripts', 'dev-check.mjs'), '--route', route, '--see', '[data-stage-ready="true"]'], { stdio: 'inherit' })
  process.exit(check.status ?? 1)
}
