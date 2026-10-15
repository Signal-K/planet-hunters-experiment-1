import { expect, test } from '@playwright/test'
import { DEV_GROUPS } from '../../lib/devPresets'
import { checkGameplayVisible } from './checks'
import { VIEWPORTS, expectSound, stage } from './helpers'

// One test per screen per viewport. Each mounts a single fixture; none needs a prior step.
// Derived from the dev preset list, so a new fixture is covered at all three sizes without editing this file.
const SCREENS = DEV_GROUPS.flatMap(g => g.shots.map(shot => shot.key))

// The Takeon field's Pixi WebGL context kills headless Chrome (GPU process) on this machine, with or without swiftshader.
// Pixi falls back to its canvas renderer when no context is available, which is what these tests then capture.
const NO_WEBGL = new Set(['ui-rover-survey', 'ui-tess-discovery'])
const denyWebgl = () => {
  const get = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    return /webgl/.test(kind) ? null : (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
  } as typeof get
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    for (const preset of SCREENS) {
      test(`${preset} is sound`, async ({ page }, info) => {
        if (NO_WEBGL.has(preset)) await page.addInitScript(denyWebgl)
        const { errors } = await stage(page, preset)
        await page.screenshot({ path: info.outputPath(`${preset}-${vp}.png`) })
        await expectSound(page, errors)
        // A screen that mounts but paints nothing passes the structural checks, so assert a real frame too.
        expect((await checkGameplayVisible(page)).failures, 'scene paints nothing').toEqual([])
      })
    }
  })
}
