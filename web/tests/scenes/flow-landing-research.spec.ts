import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

// SSL-667: landing research is a real Academy card, and once researched the Hangar offers the Lander Module room.
const READY = { patch: { missionsDone: 4, researchXP: 150, landingResearched: false } }

for (const [size, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(size, () => {
    test.use({ viewport })

    test(`Academy partners tab offers landing research (${size})`, async ({ page }) => {
      const { errors } = await stage(page, 'ui-academy', READY)
      expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
      await page.getByTestId('academy-tab-partners').click()
      const card = page.getByTestId('academy-landing-research')
      await card.scrollIntoViewIfNeeded()
      await expect(card).toBeVisible()
      await expect(card.getByRole('button', { name: /Research · 100 XP/ })).toBeEnabled()
      await page.screenshot({ path: test.info().outputPath(`landing-research-${size}.png`) })
      await expectSound(page, errors)
    })
  })
}

test('researching landing spends the XP and opens the lander room in the Hangar', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const { errors } = await stage(page, 'ui-academy', READY)
  await page.getByTestId('academy-tab-partners').click()
  await page.getByTestId('academy-landing-research').getByRole('button', { name: /Research/ }).click()
  await expect(page.getByTestId('academy-landing-research')).toHaveCount(0)
  await page.getByRole('button', { name: 'Fit Lander Module in Hangar' }).click()
  await expect(page.getByTestId('hangar-screen')).toBeVisible()
  await page.getByTestId('open-ship-customizer').click()
  await expect(page.getByTestId('ship-slot-lander')).toHaveCount(1)
  await expectSound(page, errors)
})

test('landing research waits for two missions', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const { errors } = await stage(page, 'ui-academy', { patch: { missionsDone: 1, researchXP: 150, landingResearched: false } })
  await page.getByTestId('academy-tab-partners').click()
  await expect(page.getByTestId('academy-landing-research').getByRole('button', { name: /Research/ })).toBeDisabled()
  await expectSound(page, errors)
})
