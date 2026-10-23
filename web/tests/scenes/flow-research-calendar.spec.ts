import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

// SSL-663: the stamp calendar and community bar open straight from a preset, with no play history.
for (const [size, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(size, () => {
    test.use({ viewport })

    test(`empty month shows no stamps and no streak (${size})`, async ({ page }) => {
      const { errors } = await stage(page, 'ui-research-calendar-empty')
      expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
      const cal = page.getByTestId('research-calendar')
      await cal.scrollIntoViewIfNeeded()
      await expect(cal).toBeVisible()
      await expect(cal.locator('[data-stamped="true"]')).toHaveCount(0)
      await expect(page.getByTestId('research-streak')).toHaveText('No streak yet')
      await page.screenshot({ path: test.info().outputPath(`calendar-empty-${size}.png`) })
      await expectSound(page, errors)
    })

    test(`half month shows stamps, a streak count and the community bar (${size})`, async ({ page }) => {
      const { errors } = await stage(page, 'ui-research-calendar-month-half')
      const cal = page.getByTestId('research-calendar')
      await cal.scrollIntoViewIfNeeded()
      await expect(cal.locator('[data-stamped="true"]').first()).toBeVisible()
      await expect(page.getByTestId('research-community-bar')).toBeVisible()
      await page.screenshot({ path: test.info().outputPath(`calendar-half-${size}.png`) })
      await expectSound(page, errors)
    })
  })
}

// Real path: a survey scan that has run its time resolves through the game loop and stamps today.
test('resolving a survey scan stamps today on the calendar', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const { errors } = await stage(page, 'ui-research-calendar-empty', {
    patch: { activeScan: { targetId: 'eros', startedAt: Date.now() - 86_400_000 } },
  })
  const cal = page.getByTestId('research-calendar')
  await cal.scrollIntoViewIfNeeded()
  await expect(cal.locator('[data-today="true"][data-stamped="true"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('research-streak')).toHaveText('1 day running')
  await expect(page.getByTestId('research-task-survey')).toHaveAttribute('data-done', 'true')
  await expect(page.getByTestId('research-task-classification')).toHaveAttribute('data-done', 'false')
  expect(errors).toEqual([])
})

// SSL-673: the bar adds every other player's stamps from `/api/community/research`.
const research = (over: object = {}) => ({ month: new Date().toISOString().slice(0, 7), others: 640, goal: 1000, bonusPct: 3, reachedAt: null, bonusUntil: null, ...over })

for (const [size, viewport] of Object.entries(VIEWPORTS)) {
  test(`community bar shows the served total and sits first on the Control Station (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.route('**/api/community/research', r => r.fulfill({ json: research() }))
    const { errors } = await stage(page, 'ui-research-calendar-empty')
    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    const bar = page.getByTestId('research-community-bar')
    await expect(bar).toContainText('640 / 1000')
    await page.getByTestId('help-close').click()
    await expect(page.getByTestId('research-community-state')).toHaveAttribute('data-state', 'filling')
    // The plate is the first thing in the content column, above the instrument board.
    const first = await page.evaluate(() => document.querySelector('[data-testid="research-calendar"]')?.parentElement?.firstElementChild?.getAttribute('data-testid'))
    expect(first).toBe('research-calendar')
    await page.screenshot({ path: test.info().outputPath(`community-filling-${size}.png`) })
    await expectSound(page, errors)
  })
}

test('a full bar shows the open bonus week', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const until = Date.now() + 5 * 86_400_000
  await page.route('**/api/community/research', r => r.fulfill({ json: research({ others: 1004, reachedAt: Date.now() - 2 * 86_400_000, bonusUntil: until }) }))
  const { errors } = await stage(page, 'ui-research-calendar-month-half')
  await page.getByTestId('help-close').click()
  await expect(page.getByTestId('research-community-state')).toHaveAttribute('data-state', 'bonus')
  await expect(page.getByTestId('research-community-state')).toContainText('+3%')
  await page.getByTestId('research-community-bar').scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('community-bonus-phone.png') })
  expect(errors).toEqual([])
})

// Real path: the Exchange credits +3% on an ore sale inside the bonus week, and the normal price outside it.
test('the Exchange pays the research bonus on a real sale', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const readFrancs = async () => Number((await page.getByTestId('market-balance').getAttribute('aria-label'))!.replace(/[^0-9]/g, ''))
  async function sellOne(bonusUntil: number) {
    const { errors } = await stage(page, 'ui-market', { patch: { researchBonusUntil: bonusUntil } })
    const before = await readFrancs()
    await page.getByTestId('exchange-crate-iron').click()
    await expect.poll(readFrancs).toBeGreaterThan(before)
    expect(errors).toEqual([])
    return (await readFrancs()) - before
  }
  const plain = await sellOne(Date.now() - 1000)
  await expect(page.getByTestId('market-research-bonus')).toHaveCount(0)
  const boosted = await sellOne(Date.now() + 86_400_000)
  await expect(page.getByTestId('market-research-bonus')).toContainText('+3%')
  await page.screenshot({ path: test.info().outputPath('exchange-bonus-phone.png') })
  expect(boosted).toBe(Math.round(plain * 1.03))
})

// Real path: finished goods pay the same +3% on the Exchange inside the bonus week.
test('the Exchange pays the research bonus on a finished-goods sale', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const readFrancs = async () => Number((await page.getByTestId('market-balance').getAttribute('aria-label'))!.replace(/[^0-9]/g, ''))
  async function sellOne(bonusUntil: number) {
    const { errors } = await stage(page, 'ui-market', { patch: { researchBonusUntil: bonusUntil, refinedGoods: { 'refined-copper': 2 } } })
    const before = await readFrancs()
    const crate = page.getByTestId('exchange-crate-refined-copper')
    await crate.scrollIntoViewIfNeeded()
    await crate.click()
    await expect.poll(readFrancs).toBeGreaterThan(before)
    expect(errors).toEqual([])
    return (await readFrancs()) - before
  }
  const plain = await sellOne(Date.now() - 1000)
  const boosted = await sellOne(Date.now() + 86_400_000)
  await page.screenshot({ path: test.info().outputPath('exchange-refined-bonus-phone.png') })
  expect(boosted).toBe(Math.round(plain * 1.03))
})
