#!/usr/bin/env node
// SSL-423: the native app follows the same 14pt text floor as the web loop screens.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'native', 'App')
const FLOOR = 14
const SIZE = /AppFont\.(?:display|body|mono)\((\d+(?:\.\d+)?)|\.system\(size:\s*(\d+(?:\.\d+)?)/g
const failures = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.swift')) scan(path)
  }
}

function scan(path) {
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('text-floor-ignore')) return
    for (const m of line.matchAll(SIZE)) {
      const size = Number(m[1] ?? m[2])
      if (size < FLOOR) failures.push(`${path.replace(root, 'native/App')}:${i + 1} font ${size}pt < ${FLOOR}pt`)
    }
  })
}

walk(root)
if (failures.length) {
  console.error(`native text floor: ${failures.length} violation(s)\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('native text floor: ok (14pt)')
