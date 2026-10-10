import { test } from '@playwright/test'
import { VIEWPORTS, expectSound, stage } from './helpers'

// One test per screen per viewport. Each mounts a single fixture; none needs a prior step.
const SCREENS = [
  'm1-intro', 'm1-hub', 'm1-fab', 'm1-mining', 'm1-debrief',
  'transport-hub', 'transport-fab', 'transport-mining', 'transport-delivery', 'transport-debrief',
  'storage-hub', 'storage-build',
  'telescope-hub', 'telescope-fab', 'telescope-transit', 'telescope-debrief',
  'ui-tess-discovery', 'ui-mission-board', 'ui-build', 'ui-skill-tree', 'ui-target-picker',
  'ui-rover-mining', 'ship-customizer', 'ui-hangar-assembly', 'ui-instrument-hub',
  'ui-saturn-storm-search', 'ui-asteroid-discovery', 'ui-academy',
]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    for (const preset of SCREENS) {
      test(`${preset} is sound`, async ({ page }, info) => {
        const { errors } = await stage(page, preset)
        await page.screenshot({ path: info.outputPath(`${preset}-${vp}.png`) })
        await expectSound(page, errors)
      })
    }
  })
}
