// SSL-569: a veteran account (10 missions, old onboarding, stale flag, flight plan
// reopened) loads through normalizeState into Free Ops with an unlocked board.
import { expect, test } from '@playwright/test'
import { stage, VIEWPORTS } from './helpers'

const LEGACY_PLAYER = {
  missionsDone: 10,
  freeOperations: false,
  transitSatelliteLaunchedAt: null,
  deepSpaceTelescopeBuilt: false,
  flightPlan: { completed: { mining: true }, hidden: false, activeSince: 1_760_000_000_000 },
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`legacy player mission board is in Free Ops at ${name}`, async ({ page }, info) => {
    await page.setViewportSize(size)
    const { errors } = await stage(page, 'ui-mission-board', { patch: LEGACY_PLAYER, normalize: true })
    expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([size.width, size.height])
    await expect(page.getByRole('button', { name: /ACCEPT & PREPARE/ }).first()).toBeEnabled()
    await page.screenshot({ path: info.outputPath(`legacy-free-ops-board-${size.width}x${size.height}.png`) })
    expect(errors).toEqual([])
  })
}
