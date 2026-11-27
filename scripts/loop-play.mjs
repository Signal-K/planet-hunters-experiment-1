#!/usr/bin/env node
/**
 * Visual test of the core loop, requested by Liam (27 Nov): Base → Map → pick a
 * place → launch review → launch → flight → mine → return → settle cargo →
 * debrief → Base → Surface Silo. It plays the real game through
 * `scripts/scene-drive.mjs` (one browser, real clicks), saves a screenshot at
 * every step, and writes a contact sheet to `.scene-shots/loop/index.html`.
 *
 *   node scripts/loop-play.mjs [--place mars] [--ore 4]
 *
 * A step fails when its expected text never appears or a console error fires.
 * Exit code is 1 on any failure, so a regression in the loop is loud. The run
 * starts from the account-free `play-loop` scene (preset `loop-base`) and needs
 * the local stack (`make ensure`).
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, '.scene-shots', 'loop')
const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback }
const PLACE = flag('place', 'mars')
const ORE = Number(flag('ore', '4'))
const SILO_START = Number(flag('silo-start', '0'))

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const steps = []

/** Run one scene-drive command. Returns what it printed. */
function drive(...cmd) {
  let out = ''
  try { out = execFileSync('node', [join(root, 'scripts/scene-drive.mjs'), ...cmd], { cwd: root, encoding: 'utf8', timeout: 120_000 }) }
  catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}` }
  const shot = out.split('\n').find(l => l.endsWith('.png'))
  const monitor = out.split('\n').find(l => l.startsWith('monitor '))
  let errors = []
  try { errors = JSON.parse(monitor.slice(8)).errors ?? [] } catch { /* no monitor line */ }
  return { out, shot, errors }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const look = () => drive('look').out

/** Poll the screen until `text` (or a regex) is on it. */
async function waitFor(text, seconds = 60) {
  const re = text instanceof RegExp ? text : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const end = Date.now() + seconds * 1000
  while (Date.now() < end) {
    const screen = look()
    if (re.test(screen)) return screen
    await sleep(1500)
  }
  return null
}

/** Record a step: name, what the player should see, the shot, any console errors. */
function record(name, expected, found, result) {
  // A 404 carries no URL in the console line. The Takeon sandbox parts file is absent from some checkouts, so
  // a plain 404 is shown on the sheet as a warning and does not fail the step; anything else does.
  const all = result?.errors ?? []
  const errors = all.filter(e => !/status of 404/.test(e))
  const warnings = all.length - errors.length
  const ok = !!found && errors.length === 0
  let image = ''
  if (result?.shot) {
    image = `${String(steps.length + 1).padStart(2, '0')}-${basename(result.shot)}`
    try { copyFileSync(result.shot, join(outDir, image)) } catch { image = '' }
  }
  steps.push({ name, expected, ok, found: !!found, errors, warnings, image })
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${found ? 'console errors' : `never saw "${expected}"`}`}`)
  for (const e of errors) console.log(`    ${e.slice(0, 160)}`)
  return ok
}

/** Position of a labelled element from `look` output, for canvas buttons a click cannot reach. */
function where(screen, testId) {
  const m = screen.match(new RegExp(`\\[${testId}\\][^@]*@(\\d+),(\\d+)`))
  return m ? [Number(m[1]), Number(m[2])] : null
}

async function main() {
  // 1. Base
  let r = drive('open', 'play-loop')
  let screen = await waitFor('hub-new-mission-btn', 40)
  if (!record('Base opens with the Map one tap away', 'Map', screen, r)) return

  // 2. Map
  r = drive('click', 'Map')
  screen = await waitFor('map-node-earth', 30)
  if (!record('Map shows the solar system', 'map-node-earth', screen, r)) return

  // 3. Pick a planet
  const node = where(screen, `map-node-${PLACE}`)
  if (!node) return record(`Map has ${PLACE}`, `map-node-${PLACE}`, null, r)
  r = drive('tap', String(node[0]), String(node[1]))
  screen = await waitFor('AGENCY MISSIONS', 6)
  // A planet with moons first shows its system; tapping the planet again opens its missions.
  if (!screen) {
    const again = where(look(), `map-node-${PLACE}`)
    if (again) r = drive('tap', String(again[0]), String(again[1]))
    screen = await waitFor('AGENCY MISSIONS', 30)
  }
  if (!record(`${PLACE} lists its missions`, 'AGENCY MISSIONS', screen, r)) return

  // 4. Select the agency mining run
  r = drive('click', 'css=[data-testid^="location-accept-self-directed-freeops"]') // the free mining run, not the flyby or probe above it
  screen = await waitFor('review-launch', 30)
  if (!record('Launch review shows one rocket and the cargo', 'review-launch', screen, r)) return
  if (/₣/.test(screen.split('\n').find(l => l.includes('review-cargo')) ?? '')) {
    steps.push({ name: 'Free mining shows no franc payout', expected: 'cargo without ₣', ok: false, found: true, errors: [], image: '' })
    console.log('✗ Free mining shows no franc payout')
  }

  // 5. Launch and fly
  r = drive('click', 'LAUNCH')
  screen = await waitFor(/transit-destination|fire-laser-btn/, 60)
  if (!record('Launch lifts off into the flight', 'transit-destination', screen, r)) return

  // 6. Arrive and mine
  screen = await waitFor('fire-laser-btn', 120)
  if (!record('Flight arrives at the mining scene', 'fire-laser-btn', screen, drive('shot'))) return
  let cargo = 0
  for (let i = 0; i < 80 && cargo < ORE; i++) {
    screen = look()
    cargo = Number((screen.match(/CARGO (\d+)/) ?? [])[1] ?? 0)
    if (cargo >= ORE) break
    if (/FIRE NOW/.test(screen)) drive('key', 'KeyF', '--hold', '500')
    else drive('key', 'ArrowRight', '--hold', '120')
  }
  r = drive('shot')
  if (!record(`Mined ${ORE} units`, `CARGO ${ORE}`, cargo >= ORE ? 'ok' : null, r)) return

  // 7. Return to Earth
  r = drive('click', 'RETURN TO EARTH')
  screen = await waitFor('delivery-confirm', 180)
  if (!record('Return flight ends on the cargo-home sheet', 'delivery-confirm', screen, r)) return
  const noSell = !/Sell|₣\d[\d.,]*[KMB]? each/.test(screen.split('\n').filter(l => /cargo-card|summary|split-/.test(l)).join('\n'))
  steps.push({ name: 'Cargo sheet offers no sale', expected: 'no Sell choice', ok: noSell, found: true, errors: [], image: '' })
  console.log(`${noSell ? '✓' : '✗'} Cargo sheet offers no sale`)

  // 8. Settle and debrief
  r = drive('click', 'SETTLE CARGO')
  screen = await waitFor('COMPLETE FLIGHT', 30)
  if (!record('Settling the cargo opens the debrief', 'COMPLETE FLIGHT', screen, r)) return

  // 9. Back to the Base, then the silo
  r = drive('click', 'COMPLETE FLIGHT')
  screen = await waitFor('base-lift-shaft', 30)
  if (!record('Debrief returns to the Base', 'base-lift-shaft', screen, r)) return
  r = drive('click', 'Surface Silo')
  screen = await waitFor('surface-silo-panel', 20)
  if (!record('Silo holds the ore that was mined', 'surface-silo-panel', screen, r)) return
  const held = Number((screen.match(/silo-held\][^\n]*?(\d+) \/ \d+ U/) ?? [])[1] ?? 0)
  // The fixture's silo starts with SILO_START units, so the mined haul must lift it by at least ORE.
  const gained = held - SILO_START
  steps.push({ name: 'Silo total grew by the haul', expected: `+${ORE} U`, ok: gained >= ORE, found: true, errors: [], image: '' })
  console.log(`${gained >= ORE ? '✓' : '✗'} Silo total grew by the haul (${SILO_START} → ${held} U)`)
}

await main()
drive('close')

const failed = steps.filter(s => !s.ok)
const html = `<!doctype html><meta charset="utf-8"><title>Core loop playthrough</title>
<style>body{font:15px system-ui;background:#0b1220;color:#e8edf5;margin:24px}h1{font-size:20px}
.step{display:inline-block;vertical-align:top;width:300px;margin:0 12px 18px 0}.step img{width:100%;border:2px solid #2a3a55;border-radius:6px}
.ok img{border-color:#3ecf8e}.bad img{border-color:#ff6b6b}.n{font-weight:700}.err{color:#ff9b9b;font-size:12px}</style>
<h1>Core loop · ${steps.length - failed.length}/${steps.length} steps passed</h1>
${steps.map((s, i) => `<div class="step ${s.ok ? 'ok' : 'bad'}"><div class="n">${i + 1}. ${s.ok ? '✓' : '✗'} ${s.name}</div>${s.image ? `<img src="${s.image}" alt="">` : ''}${s.errors.map(e => `<div class="err">${e.replace(/</g, '&lt;')}</div>`).join('')}${s.warnings ? `<div class="err">${s.warnings} failed resource load (404)</div>` : ''}</div>`).join('')}`
writeFileSync(join(outDir, 'index.html'), html)
console.log(`\n${steps.length - failed.length}/${steps.length} steps passed · contact sheet: ${join(outDir, 'index.html')}`)
process.exit(failed.length ? 1 : 0)
