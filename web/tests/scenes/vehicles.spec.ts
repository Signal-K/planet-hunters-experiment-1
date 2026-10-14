import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'
import { vehiclesCoveringScene } from './vehicle-layer'

// Ambient rovers must be painted below every structure, building label, scene button and HUD control they can
// reach (they may pass behind one, never over it). One test per scene per viewport, plus a negative control.
const SCENES = [
  { preset: 'telescope-hub', name: 'Earth Base' },
  { preset: 'ui-launchpad', name: 'Launchpad' },
  { preset: 'ui-instrument-hub', name: 'Control Station viewport' },
]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })

    for (const scene of SCENES) {
      test(`${scene.name}: the rover never draws over a structure or control`, async ({ page }) => {
        await stage(page, scene.preset, { chrome: true })
        await expect(page.locator('[data-testid="road-rover"]')).toHaveCount(1)
        const real = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
        expect(real).toEqual({ w: size.width, h: size.height })

        const { covering, checked } = await vehiclesCoveringScene(page)
        expect(checked, 'something is in the rover lane, so the check is not vacuous').toBeGreaterThan(0)
        expect(covering, 'structures or controls painted below the rover').toEqual([])
      })
    }
  })
}

test.describe('negative control', () => {
  test.use({ viewport: VIEWPORTS.landscape })

  test('a rover lifted above the scene is reported', async ({ page }) => {
    await stage(page, 'ui-launchpad', { chrome: true })
    await page.evaluate(() => { document.querySelector<HTMLElement>('[data-testid="road-rover"]')!.style.zIndex = '30' })
    const { covering } = await vehiclesCoveringScene(page)
    expect(covering.length, 'the checker must notice a rover painted over the scene').toBeGreaterThan(0)
  })
})
