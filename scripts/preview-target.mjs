#!/usr/bin/env node
// Tells the editor's Simple Browser which page to show (see "Live preview" in AGENTS.md).
// Usage: node scripts/preview-target.mjs <file-or-route>
//        or as a Claude Code PostToolUse hook (reads the hook JSON from stdin).
// Writes web/.dev-follow.json; <DevFollow/> in the page polls /api/dev/follow and navigates.
import { renameSync, writeFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'web', '.dev-follow.json')
const pending = `${out}.${process.pid}.tmp`

// Filename stem (case-insensitive, prefix match) -> /game/<screen>.
const SCREENS = [
  ['controlstation', 'instrument-hub'], ['basemenu', 'hub?menu=1'],
  ['hub', 'hub'], ['basedock', 'hub'], ['baselayer', 'hub'],
  ['mining', 'mining'], ['hangar', 'hangar'], ['market', 'market'], ['launchpad', 'launchpad'],
  ['transit', 'transit'], ['landing', 'landing'], ['delivery', 'delivery'], ['debrief', 'debrief'],
  ['instrumenthub', 'instrument-hub'], ['instrumentviewport', 'instrument-hub'],
  ['refinery', 'refinery'], ['missionboard', 'missions'], ['missions', 'missions'],
  ['galaxy', 'galaxy'], ['targets', 'targets'],
  ['shower-run', 'ui/orionids-shower-debrief'], ['orionids', 'hub'], ['skyevent', 'hub'],
  ['build', 'build'], ['intro', 'intro'], ['roveryvey', 'rover-survey'],
]

function toRoute(input) {
  // A scene script, its feedback or its notes: show it in the Scene Studio.
  const authored = input.replace(root + '/', '').match(/^shared\/authoring\/(?:scenes|feedback)\/([a-z0-9-]+)\.toml$/)
    ?? input.replace(root + '/', '').match(/^shared\/authoring\/instructions\/scenes\/([a-z0-9-]+)(?:\.next)?\.md$/)
  if (authored) return `/game/studio?scene=${authored[1]}`
  if (input.startsWith('/')  && !input.includes('.')) return input
  if (/^\/?(web\/)?app\/game\//.test(input.replace(root + '/', ''))) {
    const m = input.match(/app\/game\/(?:\([^)]*\)\/)?([^/]+)/)
    // A file directly in a route group (layout, loading, GameLayoutClient.tsx) is not a route; fall through.
    if (m && m[1] !== '[screen]' && !m[1].includes('.')) return `/game/${m[1]}`
  }
  const stem = (input.split('/').pop() ?? '').replace(/\.(module\.css|test\.tsx?|tsx?|css)$/, '').toLowerCase()
  const hit = SCREENS.find(([k]) => stem.startsWith(k))
  if (hit) return `/game/${hit[1]}`
  return null
}

let input = process.argv[2]
if (!input) {
  try { input = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path } catch { /* no stdin */ }
}
if (!input || !/(^\/)|web\//.test(input) || /\.(test|spec)\./.test(input)) process.exit(0)
// Whatever file is edited, keep the Scene Studio's active scene declaration current.
spawnSync(process.execPath, ['--no-warnings', join(root, 'scripts', 'studio.mjs'), 'touch', input], { stdio: 'ignore', timeout: 8000 })
const route = toRoute(input)
if (!route) process.exit(0)
// Rename keeps the polling API from observing a partially-written JSON file,
// including when the host write is crossing Docker Desktop's bind mount.
writeFileSync(pending, JSON.stringify({ route, file: input, ts: Date.now() }))
renameSync(pending, out)
console.log(`preview -> ${route}`)
