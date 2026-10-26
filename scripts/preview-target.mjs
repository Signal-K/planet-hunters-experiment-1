#!/usr/bin/env node
// Tells the editor's Simple Browser which page to show (see "Live preview" in AGENTS.md).
// Usage: node scripts/preview-target.mjs <file-or-route>
//        or as a Claude Code PostToolUse hook (reads the hook JSON from stdin).
// Writes web/.dev-follow.json; <DevFollow/> in the page polls /api/dev/follow and navigates.
import { existsSync, renameSync, writeFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'web', '.dev-follow.json')
const pending = `${out}.${process.pid}.tmp`

// Filename stem (case-insensitive, prefix match) -> a disposable stage fixture.
// The follower belongs to the editor preview, so it must never open one of the
// authenticated `/game/<screen>` routes just because an implementation file was
// touched. These fixtures are deliberately representative rather than saved
// campaign state; use `node scripts/scene.mjs <id>` for an authored scene.
const SCREENS = [
  ['controlstation', 'ui-instrument-hub'], ['basemenu', 'cp-mid'],
  ['hub', 'cp-mid'], ['basedock', 'cp-mid'], ['baselayer', 'cp-mid'],
  ['mining', 'm1-mining'], ['hangar', 'ui-hangar-assembly'], ['market', 'ui-market'], ['launchpad', 'ui-launchpad'],
  ['transit', 'sandbox-transit'], ['landing', 'ui-landing'], ['delivery', 'transport-delivery'], ['debrief', 'm1-debrief'],
  ['instrumenthub', 'ui-instrument-hub'], ['instrumentviewport', 'ui-instrument-hub'],
  ['refinery', 'ui-refinery'], ['missionboard', 'ui-mission-board'], ['missions', 'ui-mission-board'],
  ['galaxy', 'ui-tess-discovery'], ['targets', 'ui-target-picker'],
  ['shower-run', 'ui-orionids-shower-debrief'], ['orionids', 'ui-orionids-ready'], ['skyevent', 'ui-orionids-ready'],
  ['build', 'ui-build'], ['intro', 'm1-intro'], ['roveryvey', 'ui-rover-survey'],
]

const ROUTE_PRESETS = {
  hub: 'cp-mid', mining: 'm1-mining', hangar: 'ui-hangar-assembly', market: 'ui-market', launchpad: 'ui-launchpad',
  transit: 'sandbox-transit', landing: 'ui-landing', delivery: 'transport-delivery', debrief: 'm1-debrief',
  'instrument-hub': 'ui-instrument-hub', refinery: 'ui-refinery', missions: 'ui-mission-board', galaxy: 'ui-tess-discovery',
  targets: 'ui-target-picker', build: 'ui-build', intro: 'm1-intro', 'rover-survey': 'ui-rover-survey',
}

const stage = (preset) => `/game/stage?preset=${encodeURIComponent(`sandbox:${preset}`)}`

function authoredStage(id) {
  const scene = join(root, 'shared', 'authoring', 'scenes', `${id}.toml`)
  if (existsSync(scene)) {
    const state = readFileSync(scene, 'utf8').match(/^state\s*=\s*"([a-z0-9-]+)"\s*$/m)?.[1]
    // The base script's canonical state is deliberately empty. The editor
    // preview should instead expose tappable structures and a working dock.
    if (state) return stage(state === 'sandbox-hub' ? 'cp-mid' : state)
  }
  // An instruction or feedback file can outlive its scene script. Keep the
  // editor panel playable rather than falling back to the authoring grid.
  return stage('cp-mid')
}

function stageRoute(route) {
  const url = new URL(route, 'http://landnam.local')
  if (url.pathname === '/game/stage') return route
  if (url.pathname === '/game/studio') return authoredStage(url.searchParams.get('scene') ?? 'hub')
  const screen = url.pathname.match(/^\/game\/([^/]+)$/)?.[1]
  if (!screen) return route
  const preset = ROUTE_PRESETS[screen] ?? 'cp-mid'
  return stage(preset)
}

function toRoute(input) {
  // A scene script, its feedback or its notes: show it in the Scene Studio.
  const authored = input.replace(root + '/', '').match(/^shared\/authoring\/(?:scenes|feedback)\/([a-z0-9-]+)\.toml$/)
    ?? input.replace(root + '/', '').match(/^shared\/authoring\/instructions\/scenes\/([a-z0-9-]+)(?:\.next)?\.md$/)
  if (authored) return authoredStage(authored[1])
  if (input.startsWith('/')  && !input.includes('.')) return stageRoute(input)
  if (/^\/?(web\/)?app\/game\//.test(input.replace(root + '/', ''))) {
    const m = input.match(/app\/game\/(?:\([^)]*\)\/)?([^/]+)/)
    // A file directly in a route group (layout, loading, GameLayoutClient.tsx) is not a route; fall through.
    if (m && m[1] !== '[screen]' && !m[1].includes('.')) return stageRoute(`/game/${m[1]}`)
  }
  const stem = (input.split('/').pop() ?? '').replace(/\.(module\.css|test\.tsx?|tsx?|css)$/, '').toLowerCase()
  const hit = SCREENS.find(([k]) => stem.startsWith(k))
  if (hit) return stage(hit[1])
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
