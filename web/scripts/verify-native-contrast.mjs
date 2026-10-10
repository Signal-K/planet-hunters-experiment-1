#!/usr/bin/env node
/**
 * SSL-430: native contrast floor. Parses the colour tokens in native/App/Theme.swift and fails when
 * a text colour drops under 4.5:1 on any light surface (bg, paper, paper2), when white label text on
 * a filled button colour drops under 4.5:1, or when Text/Button lines use a decorative colour
 * (blueBright) as their foreground. Icons and strokes are not text and are not checked.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'native', 'App')
const theme = fs.readFileSync(path.join(ROOT, 'Theme.swift'), 'utf8')
const tok = (name) => {
  const m = theme.match(new RegExp(`static let ${name}\\s*=\\s*hex\\(0x([0-9A-Fa-f]{6})\\)`))
  if (!m) throw new Error(`Theme.${name} not found`)
  return parseInt(m[1], 16)
}
const lum = (h) => {
  const v = [16, 8, 0].map(s => ((h >> s) & 255) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

const surfaces = ['bg', 'paper', 'paper2']
const textTokens = ['ink', 'textDim', 'textMuted', 'bluePress', 'teal', 'crimson']
const fills = ['blue', 'bluePress', 'teal', 'crimson']
const fails = []
for (const t of textTokens) for (const s of surfaces) {
  const r = ratio(tok(t), tok(s)); if (r < 4.5) fails.push(`Theme.${t} on Theme.${s}: ${r.toFixed(2)}:1`)
}
for (const f of fills) { const r = ratio(0xffffff, tok(f)); if (r < 4.5) fails.push(`white on Theme.${f}: ${r.toFixed(2)}:1`) }

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.swift') ? [path.join(d, e.name)] : [])
for (const f of walk(ROOT)) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/(Text|Button|Eyebrow)\(/.test(line) && /foregroundStyle\(Theme\.(blueBright|blue)\)/.test(line) && !/tap-floor-ignore|contrast-ignore/.test(line))
      fails.push(`${path.relative(ROOT, f)}:${i + 1} text uses Theme.blue/blueBright (use bluePress)`)
  })
}
if (fails.length) { console.error('native contrast: FAIL\n  ' + fails.join('\n  ')); process.exit(1) }
console.log('native contrast: ok (4.5:1)')
