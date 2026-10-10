#!/usr/bin/env node
// SSL-423: every native Button/Menu label that sets an explicit size must reach the 44pt tap floor.
// Static check over native/App: a Button block may not size itself below 44pt on either axis unless
// a frame in the same block restores 44pt (minWidth/minHeight/width/height) on that axis.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'native', 'App')
const FLOOR = 44
const failures = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.swift')) scan(path)
  }
}

function scan(path) {
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (!/\bButton\b|\bMenu\b/.test(line) || /^\s*\/\//.test(line)) return
    // A block runs from the Button to the next Button or 18 lines, whichever is first.
    let end = i + 1
    while (end < lines.length && end < i + 18 && !/\bButton\b|\bMenu\b/.test(lines[end])) end++
    const block = lines.slice(i, end).join('\n')
    if (block.includes('tap-floor-ignore')) return
    const frames = [...block.matchAll(/\.frame\(([^)]*)\)/g)].map(m => m[1])
    for (const axis of [['width', 'minWidth'], ['height', 'minHeight']]) {
      const sizes = frames.flatMap(f => axis.flatMap(key => [...f.matchAll(new RegExp(`(?:^|[ ,(])${key}:\\s*(\\d+(?:\\.\\d+)?)`, 'g'))].map(m => Number(m[1]))))
      if (sizes.length && Math.max(...sizes) < FLOOR) {
        failures.push(`${path.replace(root, 'native/App')}:${i + 1} ${axis[0]} ${Math.max(...sizes)}pt < ${FLOOR}pt`)
      }
    }
  })
}

walk(root)
if (failures.length) {
  console.error(`native tap targets: ${failures.length} violation(s)\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('native tap targets: ok (44pt)')
