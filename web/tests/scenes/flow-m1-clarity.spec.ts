import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-547 / SSL-548 (Craft mission-flow review 09/09): after M1 nothing in the dock pulses,
// and no amount in M1-M3 is shown as a bare "10M" without the franc mark.
const SCREENS = ['m1-hub', 'm1-fab', 'm1-debrief', 'm1-home', 'cp-early']
const BARE_AMOUNT = /(^|[^₣\w.,])[+−-]?\d+(\.\d+)?[MB]\b/

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`m1 clarity ${vp}`, () => {
    test.use({ viewport: size })
    for (const preset of SCREENS) {
      test(`${preset}: no bare franc amounts, no pulsing dock`, async ({ page }) => {
        await page.addInitScript(() => { try { for (const id of ['launch', 'control-station', 'tess']) localStorage.setItem(`ln-help-seen:${id}`, '1') } catch { /* private window */ } })
        await stage(page, preset, { chrome: true })
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        const text = await page.evaluate(() => document.body.innerText)
        const bare = text.split('\n').filter(l => BARE_AMOUNT.test(l))
        expect(bare, `bare amounts: ${bare.join(' | ')}`).toEqual([])
        const animated = await page.evaluate(() => [...document.querySelectorAll('[data-testid="base-dock"] *')]
          .filter(el => { const a = getComputedStyle(el).animationName; return a && a !== 'none' })
          .map(el => `${el.tagName}.${el.className}`))
        expect(animated).toEqual([])
        if (preset === 'm1-home') await page.screenshot({ path: test.info().outputPath(`m1-clarity-${vp}.png`) })
      })
    }
  })
}
