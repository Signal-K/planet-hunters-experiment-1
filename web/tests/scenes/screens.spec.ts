import { expect, test } from '@playwright/test'
import { DEV_GROUPS } from '../../lib/devPresets'
import { checkGameplayVisible } from './checks'
import { VIEWPORTS, expectSound, stage } from './helpers'

// One test per screen per viewport. Each mounts a single fixture; none needs a prior step.
// Derived from the dev preset list, so a new fixture is covered at all three sizes without editing this file.
const SCREENS = DEV_GROUPS.flatMap(g => g.shots.map(shot => shot.key))

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    for (const preset of SCREENS) {
      test(`${preset} is sound`, async ({ page }, info) => {
        const { errors } = await stage(page, preset)
        await page.screenshot({ path: info.outputPath(`${preset}-${vp}.png`) })
        await expectSound(page, errors)
        // A screen that mounts but paints nothing passes the structural checks, so assert a real frame too.
        expect((await checkGameplayVisible(page)).failures, 'scene paints nothing').toEqual([])
      })
    }
  })
}
