import { expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-651: the Orionids shower run counts its 20 fragments from the moment the run is accepted and, once
// filled, pays its francs and keeps the fragments. Hugo (22 Oct) left on a message that said he had what he needed.
// Drives the real mining and debrief screens in the full app from a seeded save, at the three viewports.
const RUN_ID = 'self-directed-orionids-night-run'
const USER = 'e2euser0000001'
const KEY = `landnam-game-state-v1:user:${USER}`
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/orionids-shower-run'

const player = (over: object) => ({
  placed: ['launchpad', 'market'],
  missionsDone: 6,
  francs: 1000,
  flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
  activeMission: { id: RUN_ID, label: 'Orionids shower run' },
  stash: {},
  ...over,
})
const seed = (screen: 'mining' | 'debrief', over: object, lastCargo?: Record<string, number>) => ({
  screen,
  missionId: RUN_ID,
  targetId: 'eros',
  ...(lastCargo ? { lastCargo } : {}),
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  player: player({ missionPhase: screen, ...over }),
})

async function open(page: Page, state: object) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s, t, r, key]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(key as string, s as string)
  }, [JSON.stringify(state), token(), JSON.stringify(record), KEY])
  await page.goto('/game')
}

/** The new card and the Collect button meet the floors. The whole-page check is not used: the spec refuses the backend, which raises a sync chip that is not part of this change. */
async function expectCardSound(page: Page, errors: string[]) {
  const report = await page.evaluate(() => {
    const small: string[] = []
    for (const el of document.querySelectorAll('[data-testid="debrief-shower-run"], [data-testid="debrief-shower-run"] *')) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim())
      if (own && parseFloat(getComputedStyle(el).fontSize) < 13.9) small.push((el.textContent ?? '').trim().slice(0, 24))
    }
    const btn = document.querySelector('[data-testid="collect-reward-btn"]')?.getBoundingClientRect()
    const card = document.querySelector('[data-testid="debrief-shower-run"]')?.getBoundingClientRect()
    return {
      small,
      btnHeight: btn?.height ?? 0,
      hscroll: document.documentElement.scrollWidth > innerWidth + 1,
      cardInView: !!card && card.left >= 0 && card.right <= innerWidth + 1,
      btnInView: !!btn && btn.bottom <= innerHeight + 1 && btn.top >= 0,
    }
  })
  expect(report.small, 'text under 14px in the shower card').toEqual([])
  expect(report.btnHeight, 'collect target under 44px').toBeGreaterThanOrEqual(44)
  expect(report.hscroll, 'page scrolls sideways').toBe(false)
  expect(report.cardInView, 'card clipped at the sides').toBe(true)
  expect(report.btnInView, 'collect button off screen').toBe(true)
  expect(errors, 'page errors').toEqual([])
}

const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), KEY)
const digits = (text: string) => Number(text.replace(/[^0-9]/g, ''))

test.describe('shower run count', () => {
  test.use({ viewport: VIEWPORTS.phone })

  test('catches from earlier runs do not fill a new run', async ({ page }) => {
    // 25 caught in all, 10 of them before this run was accepted: 15 of 20.
    await open(page, seed('mining', { orionidsFragments: { caught: 25, redeemed: 0 }, orionidsRunBaseline: 10 }))
    await expect(page.getByTestId('mining-order-readout')).toContainText('15 of 20', { timeout: 30_000 })
    expect(await page.evaluate(() => innerWidth)).toBe(VIEWPORTS.phone.width)
    await page.getByTestId('mining-gate-sell').click()
    await page.waitForTimeout(1500)
    await expect(page.getByText('Shower Run', { exact: true })).toBeVisible()
    await expect(page.getByText(/instead of a fixed client payout/)).toHaveCount(0)
    // The explainer sits over the order card. Dismiss it so the count itself is in the shot.
    await page.getByTestId('dismiss-freeops-mining-explainer').click()
    await page.screenshot({ path: `${OUT}/mining-15-of-20.png` })
  })
})

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`twenty catches since accept fill the order at ${vp}`, async ({ page }) => {
    await page.setViewportSize(size)
    await open(page, seed('mining', { orionidsFragments: { caught: 25, redeemed: 0 }, orionidsRunBaseline: 5 }))
    await expect(page.getByTestId('mining-order-readout')).toContainText('20 of 20', { timeout: 30_000 })
    expect(await page.evaluate(() => innerWidth)).toBe(size.width)
    await page.getByTestId('mining-gate-sell').click()
    await page.waitForTimeout(1500)
    await page.getByTestId('dismiss-freeops-mining-explainer').click()
    await page.screenshot({ path: `${OUT}/mining-20-of-20-${vp}.png` })
  })
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`shower run debrief ${vp}`, () => {
    test.use({ viewport: size })

    test('a filled run pays its francs and keeps the fragments', async ({ page }, info) => {
      test.setTimeout(120_000)
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      await open(page, seed(
        'debrief',
        { orionidsFragments: { caught: 40, redeemed: 0 }, orionidsRunBaseline: 20, stash: { orionid_debris: 19, iron: 2 } },
        { orionid_debris: 19, iron: 2 },
      ))
      const card = page.getByTestId('debrief-shower-run')
      await expect(card).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('debrief-shower-fragments')).toContainText('20')
      const payout = digits(await page.getByTestId('debrief-shower-payout').innerText())
      expect(payout).toBeGreaterThan(0)
      await page.screenshot({ path: `${OUT}/debrief-${vp}.png` })
      // The card sits in the scrolling column. Its last row must come into view clear of the dock, at every size.
      const fragments = page.getByTestId('debrief-shower-fragments')
      await fragments.scrollIntoViewIfNeeded()
      const row = await fragments.boundingBox()
      const dock = await page.getByTestId('collect-reward-btn').boundingBox()
      expect(row && dock && row.y + row.height <= dock.y + 1, 'fragments row hidden under the dock').toBe(true)
      await page.screenshot({ path: `${OUT}/debrief-${vp}-scrolled.png` })
      await expectCardSound(page, errors)

      await page.getByTestId('collect-reward-btn').click()
      await expect.poll(async () => (await saved(page)).player?.francs ?? 0, { timeout: 30_000 }).toBeGreaterThan(1000 + payout)
      const after = (await saved(page)).player
      // Paid once, the fragments are still held (not sold), and the count starts again at zero.
      expect(after.stash?.orionid_debris).toBe(19)
      expect(after.orionidsRunBaseline).toBe(after.orionidsFragments.caught)
      info.annotations.push({ type: 'francs', description: `${1000} -> ${after.francs} (payout ${payout})` })
    })
  })
}

test('a run that is not filled shows no shower card and pays no run francs', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  await open(page, seed(
    'debrief',
    { orionidsFragments: { caught: 22, redeemed: 0 }, orionidsRunBaseline: 20, stash: { orionid_debris: 2 } },
    { orionid_debris: 2 },
  ))
  await expect(page.getByTestId('collect-reward-btn')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('debrief-shower-run')).toHaveCount(0)
})

// A real account on the local stack, through the landing entry: the shower run is accepted with the count recorded.
test('a new account accepts the shower run with its count recorded at zero', async ({ page }) => {
  test.setTimeout(150_000)
  await page.setViewportSize(VIEWPORTS.phone)
  await page.goto('/')
  await page.getByTestId('landing-orionids').click()
  await page.getByTestId('auth-gate-quick-account').click()
  await expect(page.getByTestId('auth-gate-email')).toBeHidden({ timeout: 90_000 })
  await expect(page.getByTestId('mission-launch-review')).toBeVisible({ timeout: 30_000 })
  const state = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('landnam-game-state-v1'))
    return key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null
  })
  expect(state?.missionId).toBe(RUN_ID)
  // A number, not missing: the order counts from this accept.
  expect(state?.player?.orionidsRunBaseline).toBe(0)
})
