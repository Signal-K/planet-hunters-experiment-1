#!/usr/bin/env node
/** Blueprint chrome hue guard. World art may use the approved dusk palette.
 * Check shared UI tokens, not every world pixel or historical asset.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(fs.readFileSync(path.join(WEB_ROOT, '../shared/tokens/tokens.json'), 'utf8'))
  const chrome = ['blueprintBg', 'blueprintPaper', 'blueprintPaper2', 'blueprintInk', 'blueprintBlue',
    'cyan', 'cyanBright', 'cyanPress', 'amber', 'amberBright', 'amberPress', 'warn']
  const failures = chrome.flatMap(key => scanText(tokens.colors[key]).map(hit => `${key}: ${hit.color} hue ${hit.hue}`))
  if (failures.length) {
    console.error('verify:hue-palette: blueprint chrome must use blue/teal/ice\n' + failures.join('\n'))
    process.exit(1)
  }
  console.log(`verify:hue-palette: ${chrome.length} shared chrome tokens clean; scene palette governed by game-theme-spec.md`)
}
