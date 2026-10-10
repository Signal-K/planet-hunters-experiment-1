#!/usr/bin/env node
/**
 * Blueprint palette hue check (SSL-425).
 *
 * The light blueprint theme is cyan / teal / ice only: no orange, no purple.
 * Fails on any hex or rgb()/rgba() colour whose hue falls in 12-48 deg
 * (orange/amber) or 250-325 deg (purple/magenta) and that is saturated enough
 * to read as a hue (greys, creams and near-white/black are ignored).
 *
 * Scans tokens, CSS, SVG and canvas palettes (#rrggbb, 0xrrggbb, rgb()) in TS/TSX/JS sources and
 * the native Swift sources (hex strings, Color(red:green:blue:)).
 * Run: npm run verify:hue-palette
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_DIRS = ['app', 'components', 'lib', 'public']
const EXTENSIONS = /\.(css|tsx?|svg|mjs|swift)$/
// Native (SwiftUI/SpriteKit) sources are scanned too so web and native share one palette rule.
const NATIVE_DIRS = ['../native/App', '../native/LandnamCore/Sources']
const SKIP = /node_modules|\.next|\.test\.|\.spec\.|__tests__|design-reference/
const BANNED_HUES = [[12, 48], [250, 325]]
const MIN_SATURATION = 0.3
const MIN_LIGHTNESS = 0.12
const MAX_LIGHTNESS = 0.92

const COLOR_REGEX = /(?:#|0x)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})|red:\s*([\d.]+)\s*,\s*green:\s*([\d.]+)\s*,\s*blue:\s*([\d.]+)/g

export function hslOf(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return { h, s, l }
}

export function bannedHue(r, g, b) {
  const { h, s, l } = hslOf(r, g, b)
  if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) return null
  const range = BANNED_HUES.find(([lo, hi]) => h >= lo && h <= hi)
  return range ? Math.round(h) : null
}

export function scanText(text) {
  const hits = []
  text.split('\n').forEach((line, i) => {
    const trimmed = line.trim()
    if (line.includes("hue-check-ignore")) return
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    for (const m of line.matchAll(COLOR_REGEX)) {
      let r, g, b
      if (m[1]) {
        let hex = m[1]
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
      } else if (m[5]) {
        r = Math.round(+m[5] * 255); g = Math.round(+m[6] * 255); b = Math.round(+m[7] * 255)
      } else {
        r = +m[2]; g = +m[3]; b = +m[4]
      }
      const hue = bannedHue(r, g, b)
      if (hue !== null) hits.push({ line: i + 1, color: m[0], hue })
    }
  })
  return hits
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (SKIP.test(full)) continue
    if (entry.isDirectory()) walk(full, out)
    else if (EXTENSIONS.test(entry.name)) out.push(full)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = []
  for (const d of [...SCAN_DIRS, ...NATIVE_DIRS]) {
    const full = path.join(WEB_ROOT, d)
    if (fs.existsSync(full)) walk(full, files)
  }
  let failures = 0
  for (const file of files) {
    for (const hit of scanText(fs.readFileSync(file, 'utf8'))) {
      failures++
      console.error(`${path.relative(WEB_ROOT, file)}:${hit.line}  ${hit.color}  hue ${hit.hue}`)
    }
  }
  if (failures) {
    console.error(`\nverify:hue-palette: ${failures} orange/purple colour(s). Use cyan/teal/ice tokens.`)
    process.exit(1)
  }
  console.log(`verify:hue-palette: ${files.length} files clean`)
}
