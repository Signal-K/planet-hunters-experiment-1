import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { checkClipping, checkContrast, checkGameplayVisible, collectStructural } from './checks'
import { VIEWPORTS, stage } from './helpers'

// Known visual debt is ratcheted, like the design-token lint: a violation listed in evidence-baseline.json is reported
// (annotation) but does not fail; any violation NOT in the baseline fails. Regenerate after fixing debt with
// EVIDENCE_WRITE_BASELINE=1 npx playwright test evidence --workers=1 (never to hide a new regression).
const BASELINE_FILE = path.join(__dirname, 'evidence-baseline.json')
const WRITE = process.env.EVIDENCE_WRITE_BASELINE === '1'
const baseline: Record<string, string[]> = !WRITE && fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {}
const written: Record<string, string[]> = WRITE && fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {}

// Evidence pass (SSL-507): per key screen per viewport, save a screenshot and assert the deterministic checks.
// Contrast skips (image/canvas backgrounds) are attached as annotations so the evidence index shows why.
const KEY_PRESETS = ['m1-hub', 'm1-mining', 'transport-hub', 'telescope-hub', 'ui-mission-board', 'ship-customizer', 'ui-instrument-hub', 'ui-academy']

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    for (const preset of KEY_PRESETS) {
      test(`${preset} evidence`, async ({ page }, info) => {
        const { errors } = await stage(page, preset)
        // Let entry/fade animations settle so checks never measure a mid-transition frame.
        await page.evaluate(() => Promise.race([Promise.allSettled(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished)), new Promise(r => setTimeout(r, 3000))]))
        await page.screenshot({ path: info.outputPath(`evidence-${preset}-${vp}.png`) })
        const [structural, contrast, clipping, visible] = [await collectStructural(page), await checkContrast(page), await checkClipping(page), await checkGameplayVisible(page)]
        for (const s of contrast.skipped) info.annotations.push({ type: 'contrast-skip', description: s })
        const problems: Record<string, unknown> = {
          'page errors': errors, 'horizontal scroll': structural.hscroll || [], 'overlapping buttons': structural.overlaps,
          'tap targets under 44px': structural.taps, 'text under 14px': structural.small,
          'contrast below AA': contrast.failures, 'clipped text': clipping.failures, 'gameplay not visible': visible.failures,
        }
        const flat = Object.entries(problems).flatMap(([k, v]) => (Array.isArray(v) ? v.map(x => `${k}: ${x}`) : []))
        const key = `${vp}/${preset}`
        if (WRITE) { written[key] = flat; fs.writeFileSync(BASELINE_FILE, JSON.stringify(Object.fromEntries(Object.entries(written).filter(([, v]) => v.length).sort()), null, 2) + '\n'); return }
        const known = new Set(baseline[key] ?? [])
        for (const v of flat) info.annotations.push({ type: known.has(v) ? 'known-debt' : 'violation', description: v })
        const fresh = flat.filter(v => !known.has(v))
        expect(fresh, 'new evidence violations (not in evidence-baseline.json)').toEqual([])
      })
    }
  })
}
