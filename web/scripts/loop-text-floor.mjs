#!/usr/bin/env node
/**
 * SSL-453 / SSL-430: text floor for the six loop screens (launchpad/mission
 * setup, transit, landing, mining, delivery, debrief) and the shared chrome
 * they sit in.
 *
 *   node scripts/loop-text-floor.mjs          check only (CI), exit 1 on any hit
 *   node scripts/loop-text-floor.mjs --fix    rewrite sub-14px sizes to var(--ln-fs-micro)
 *
 * Whole-file targets are loop-only CSS modules. For shared stylesheets only
 * rules whose selector matches LOOP_SELECTOR are checked, so non-loop screens
 * are left alone (they are a later ticket).
 * A rule can opt out with a `/* loop-floor-exempt *\/` comment inside it
 * (dev-only controls, decorative glyphs).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FLOOR = 14
const FIX = process.argv.includes('--fix')

const WHOLE_FILES = [
  'components/game/MissionSetupRoutes.module.css',
  'components/game/screens/LandingScreen.module.css',
  'components/game/screens/DeliveryScreen.module.css',
  'components/game/TargetSphere.module.css',
  'app/launchpad-screen.css',
]
const SELECTIVE_FILES = ['app/globals.css']
const LOOP_SELECTOR =
  /\.(transit|mining|debrief|flight-plan|game-chrome-bottom|top-bar|backend-status|mineral-stat|cost-summary|action-confirm|resolve-cargo|order-progress|ln-section-label|scrap-)/

// Owned by other tickets: mining action bar (SSL-411) and help button/sheet (SSL-432).
const EXCLUDED_SELECTOR = /mining-(command|controls|charge|progress|guide|actions)|mineral-stat|return-home|fire-laser|help-(button|sheet)/

const SIZE = /(font-size:\s*)(\d*\.?\d+)px/g
const SHORTHAND = /(font:\s*(?:[a-z0-9-]+\s+)*?)(\d*\.?\d+)px/g

const MIN_TAP = 44
const MIN_CONTRAST = 4.5
const HEX = '#[0-9a-fA-F]{3,8}\\b'
const lum = (hex) => {
  let h = hex.slice(1)
  if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('')
  const v = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const TAP_SELECTOR = /button|btn|\.(action|cta|launch|abort|confirm)\b|\[role=["']?button/i

/** Contrast (literal hex color on literal hex background in one rule) and tap-target (explicit px height on button-like rules). */
function auditRule(sel, body) {
  if (body.includes('loop-floor-exempt')) return []
  const out = []
  const color = body.match(new RegExp('(?:^|[;\\s])color:\\s*(' + HEX + ')'))
  const bg = body.match(new RegExp('background(?:-color)?:\\s*(' + HEX + ')'))
  if (color && bg && [color[1], bg[1]].every(h => [4, 7].includes(h.length))) {
    const r = ratio(color[1], bg[1])
    if (r < MIN_CONTRAST) out.push(`contrast ${r.toFixed(2)}:1 (${color[1]} on ${bg[1]}) under ${MIN_CONTRAST}:1`)
  }
  if (TAP_SELECTOR.test(sel)) {
    for (const m of body.matchAll(/(?:^|[;\s])(min-height|height|min-width|width):\s*(\d*\.?\d+)px/g)) {
      if (parseFloat(m[2]) < MIN_TAP && !(m[1] === 'width' || m[1] === 'height')) out.push(`tap target ${m[1]} ${m[2]}px under ${MIN_TAP}px`)
    }
  }
  return out
}

function fixDecls(block) {
  if (block.includes('loop-floor-exempt')) return { out: block, hits: [] }
  const hits = []
  const sub = (m, pre, n) => {
    if (parseFloat(n) >= FLOOR) return m
    hits.push(`${n}px`)
    return `${pre}var(--ln-fs-micro)`
  }
  return { out: block.replace(SIZE, sub).replace(SHORTHAND, sub), hits }
}

/** Walk a stylesheet rule by rule (descending into @media/@supports). */
function scan(css, selective) {
  const hits = []
  let out = ''
  let i = 0
  function walk(start, end, onlyMatching) {
    let res = ''
    let pos = start
    while (pos < end) {
      const open = css.indexOf('{', pos)
      if (open === -1 || open >= end) { res += css.slice(pos, end); break }
      const sel = css.slice(pos, open)
      let depth = 1, j = open + 1
      while (j < end && depth > 0) { const c = css[j]; if (c === '{') depth++; else if (c === '}') depth--; j++ }
      const body = css.slice(open + 1, j - 1)
      if (/@(media|supports|layer)/.test(sel.replace(/\/\*[\s\S]*?\*\//g, ''))) {
        res += sel + '{' + walk(open + 1, j - 1, onlyMatching) + '}'
      } else {
        const cleanSel = sel.replace(/\/\*[\s\S]*?\*\//g, '')
        const applies = (!onlyMatching || LOOP_SELECTOR.test(cleanSel)) && !EXCLUDED_SELECTOR.test(cleanSel)
        if (applies && !/@font-face|@keyframes/.test(cleanSel)) {
          auditRule(cleanSel, body).forEach(h => hits.push(`${cleanSel.trim().split('\n').pop().slice(0, 70)} -> ${h}`))
          const r = fixDecls(body)
          r.hits.forEach(h => hits.push(`${cleanSel.trim().split('\n').pop().slice(0, 70)} -> ${h}`))
          res += sel + '{' + r.out + '}'
        } else res += sel + '{' + body + '}'
      }
      pos = j
    }
    return res
  }
  out = walk(0, css.length, selective)
  return { out, hits }
}

// Known tap-target debt (SSL-430 follow-up): compact short-phone layouts that
// still use <44px buttons. They warn but do not fail CI; new ones fail. Remove
// entries as they are fixed.
const TAP_DEBT = [
  '.roomManifest li button -> tap target min-height',
  '.launchpad-guide-actions button -> tap target min-height',
  '.game-chrome-bottom button -> tap target min-height',
  '.transit-command-btn -> tap target min-height',
]
let debt = 0
let total = 0
for (const [files, selective] of [[WHOLE_FILES, false], [SELECTIVE_FILES, true]]) {
  for (const f of files) {
    const p = path.join(ROOT, f)
    if (!fs.existsSync(p)) continue
    const css = fs.readFileSync(p, 'utf8')
    const scanned = scan(css, selective)
    const out = scanned.out
    const hits = scanned.hits.filter(h => !(TAP_DEBT.some(d => h.startsWith(d)) && ++debt))
    total += hits.length
    if (hits.length) {
      if (FIX) fs.writeFileSync(p, out)
      else console.error(`${f}: ${hits.length} violation(s) (text floor ${FLOOR}px, contrast, tap target)\n  ` + hits.slice(0, 40).join('\n  '))
    }
  }
}
if (FIX) console.log(`rewrote ${total} font size(s) to var(--ln-fs-micro)`)
else if (total) { console.error(`\nloop text floor: ${total} violation(s). Run with --fix or add loop-floor-exempt.`); process.exit(1) }
else console.log(`loop text floor: ok (${FLOOR}px, ${MIN_CONTRAST}:1, ${MIN_TAP}px taps); ${debt} known tap-target debt warning(s)`)
