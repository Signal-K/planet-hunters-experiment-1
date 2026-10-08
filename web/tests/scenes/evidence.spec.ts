import { expect, test } from '@playwright/test'
import { checkClipping, checkContrast, checkGameplayVisible, collectStructural } from './checks'
import { VIEWPORTS, stage } from './helpers'

// Evidence pass (SSL-507): per key screen per viewport, save a screenshot and assert the deterministic checks.
// Contrast skips (image/canvas backgrounds) are attached as annotations so the evidence index shows why.
const KEY_PRESETS = ['m1-hub', 'm1-mining', 'transport-hub', 'telescope-hub', 'ui-mission-board', 'ship-customizer', 'ui-instrument-hub', 'ui-academy']

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    for (const preset of KEY_PRESETS) {
      test(`${preset} evidence`, async ({ page }, info) => {
        const { errors } = await stage(page, preset)
        await page.screenshot({ path: info.outputPath(`evidence-${preset}-${vp}.png`) })
        const [structural, contrast, clipping, visible] = [await collectStructural(page), await checkContrast(page), await checkClipping(page), await checkGameplayVisible(page)]
        for (const s of contrast.skipped) info.annotations.push({ type: 'contrast-skip', description: s })
        const problems: Record<string, unknown> = {
          'page errors': errors, 'horizontal scroll': structural.hscroll || [], 'overlapping buttons': structural.overlaps,
          'tap targets under 44px': structural.taps, 'text under 14px': structural.small,
          'contrast below AA': contrast.failures, 'clipped text': clipping.failures, 'gameplay not visible': visible.failures,
        }
        for (const [k, v] of Object.entries(problems)) if (Array.isArray(v) && v.length) info.annotations.push({ type: 'violation', description: `${k}: ${v.join(' | ')}` })
        const failing = Object.fromEntries(Object.entries(problems).filter(([, v]) => Array.isArray(v) && v.length))
        expect(failing, 'evidence violations').toEqual({})
      })
    }
  })
}
