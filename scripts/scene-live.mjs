#!/usr/bin/env node
/**
 * Live scene editing. Save a TOML under shared/authoring and the open web tab
 * shows a marker and reloads within about a second; the iOS Simulator is
 * rebuilt and relaunched on the same scene when --ios is given.
 *
 * Usage:
 *   node scripts/scene-live.mjs hub            web only
 *   node scripts/scene-live.mjs hub --ios      web, then rebuild + relaunch the Simulator
 *
 * Open http://localhost:4320/game/hub?follow=1 once in Simple Browser first.
 */
import { existsSync, readFileSync, watch, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [name, ...flags] = process.argv.slice(2)
const withIos = flags.includes('--ios')
if (!name) {
  console.error('Usage: node scripts/scene-live.mjs <scene id> [--ios]')
  process.exit(2)
}
const registry = JSON.parse(readFileSync(join(root, 'qa', 'scenes.json'), 'utf8'))
const entry = [...(registry.scenes ?? []), ...(registry.missions ?? [])].find(e => e.id === name)
if (!entry) {
  console.error(`Unknown scene "${name}". Run: node scripts/scene.mjs list`)
  process.exit(2)
}

const route = entry.web ? `/game/stage?preset=${encodeURIComponent(entry.web)}` : '/game/stage'
spawnSync(process.execPath, [join(root, 'scripts', 'preview-target.mjs'), route], { stdio: 'inherit' })
const marker = join(root, 'web', '.dev-scene-change.json')
const stamp = () => new Date().toLocaleTimeString('en-GB')
const post = (state, file, detail = '') =>
  writeFileSync(marker, JSON.stringify({ ts: Date.now(), state, file, scene: name, detail }))

const compile = () => spawnSync(process.execPath, [join(root, 'scripts', 'authoring.mjs'), 'compile'], { encoding: 'utf8' })

let building = false
function rebuildIos() {
  if (!withIos || !entry.native || building) return
  building = true
  const dd = '/tmp/landnam-ios'
  const build = spawn('xcodebuild', ['-project', join(root, 'native/Landnam.xcodeproj'), '-scheme', 'Landnam',
    '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', dd, 'build', 'CODE_SIGNING_ALLOWED=NO'], { stdio: 'ignore' })
  build.on('exit', code => {
    building = false
    if (code !== 0) return console.log(`${stamp()}  iOS build FAILED`)
    const app = join(dd, 'Build/Products/Debug-iphonesimulator/Landnam.app')
    spawnSync('xcrun', ['simctl', 'install', 'booted', app])
    spawnSync('xcrun', ['simctl', 'terminate', 'booted', 'com.atlasskyventures.sslandnam'])
    spawnSync('xcrun', ['simctl', 'launch', 'booted', 'com.atlasskyventures.sslandnam', '-scene', entry.native])
    console.log(`${stamp()}  iOS relaunched on ${entry.native}`)
  })
}

let timer
watch(join(root, 'shared/authoring'), { recursive: true }, (_event, file) => {
  if (!file || !/\.toml$/.test(file)) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    const result = compile()
    const out = `${result.stdout}${result.stderr}`
    if (result.status === 0) {
      post('ok', file)
      console.log(`${stamp()}  ${file} compiled, web reloading`)
      rebuildIos()
    } else {
      const problem = out.split('\n').find(l => /error/i.test(l)) ?? 'compile failed'
      post('error', file, problem.trim())
      console.log(`${stamp()}  ${file} has an error: ${problem.trim()}`)
    }
  }, 250)
})
console.log(`watching shared/authoring for ${name}${withIos ? ' (+ iOS)' : ''}${existsSync(marker) ? '' : ''}. Ctrl+C to stop.`)
console.log(`web: http://localhost:4320${route}&follow=1`)
