import { expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-576: the storage lesson (build the silo in the base scene, store ore,
// sell it later at the Exchange) runs after the first missions beside Free Ops.
const seededToken = () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
}

async function openLive(page: Page, initialState: object) {
  const record = { id: 'e2euser0000001', collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: seededToken(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
    const rec = { id: 'e2euser0000001', collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record: rec }))
    localStorage.setItem('landnam-game-state-v1:user:e2euser0000001', s as string)
  }, [JSON.stringify(initialState)])
  await page.goto('/game')
  await expect(page.getByTestId('flight-plan')).toBeVisible({ timeout: 30_000 })
}

const SHOTS = process.env.STORAGE_SHOTS_DIR

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`storage lesson ${vp}`, () => {
    test.use({ viewport: size })

    test('build the silo in the base, then store and sell later', async ({ page }) => {
      await openLive(page, {
        screen: 'hub',
        player: { placed: ['launchpad'], missionsDone: 2, francs: 3000000, freeOperations: true, flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: false } },
      })
      expect(await page.evaluate(() => window.innerWidth)).toBe(size.width)
      const plan = page.getByTestId('flight-plan')
      const shot = async (name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp}-${name}.png` }) }

      await expect(plan).toContainText('Step 1/4')
      await shot('1-build')
      await page.getByTestId('hub-build-btn').click()
      await expect(plan).toContainText('Step 2/4')
      await expect(page.getByTestId('build-option-surface-silo')).toBeVisible()
      await shot('2-place')
      await page.getByTestId('build-option-surface-silo').click()
      await page.getByTestId('build-place-underground').click()
      await expect(plan).toContainText('Step 3/4', { timeout: 10_000 })
      await shot('3-store')
      await page.getByTestId('flight-plan-go').click()
      await expect(plan).toContainText('Exchange')
      await shot('4-sell')
      await page.getByTestId('flight-plan-go').click()
      await expect(plan).toHaveCount(0)
    })
  })
}
