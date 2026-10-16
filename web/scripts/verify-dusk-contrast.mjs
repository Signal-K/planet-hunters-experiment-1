#!/usr/bin/env node
/**
 * Dusk panel contrast. Reads --dusk-* tokens from app/globals.css and fails
 * when ink, dim, muted, cta, info, or warn text drops under 4.5:1 on a dusk panel.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const css = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/globals.css'), 'utf8')
const hex = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*#([0-9A-Fa-f]{6})`))
  if (!m) throw new Error(`--${name} not found`)
  return parseInt(m[1], 16)
}
const lum = (h) => {
  const v = [16, 8, 0].map(s => ((h >> s) & 255) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const inks = ['dusk-ink', 'dusk-dim', 'dusk-muted', 'dusk-cta', 'dusk-info', 'dusk-warn']
const panels = ['dusk-panel', 'dusk-deep', 'dusk-raised']
const fails = []
for (const ink of inks) for (const panel of panels) {
  const r = ratio(hex(ink), hex(panel))
  if (r < 4.5) fails.push(`--${ink} on --${panel}: ${r.toFixed(2)}:1`)
}
if (fails.length) {
  console.error('dusk contrast: FAIL\n  ' + fails.join('\n  '))
  process.exit(1)
}
console.log('dusk contrast: ok (4.5:1)')
