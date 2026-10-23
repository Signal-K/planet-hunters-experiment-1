import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: the scan training try. A fresh account marks the dip on the light curve, taps Confirm Transit and is handed
// on (the screen used to look dead because the button stays disabled until a dip is marked). Launches bundled Chromium
// itself: installed Chrome closes pages after 15-30s on this machine.
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const SEED = {
  screen: 'hub',
  player: {
    placed: ['launchpad'],
    missionsDone: 1,
    flightPlan: { completed: { mining: true }, hidden: false, activeSince: 1 },
  },
}

async function open(page: Page) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return /webgl/.test(kind) ? null : (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof get
  })
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s, t, r, user]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(`landnam-game-state-v1:user:${user}`, s as string)
  }, [JSON.stringify(SEED), token(), JSON.stringify(record), USER])
  await page.goto('/game')
  await page.waitForTimeout(2500)
}

const state = (page: Page) => page.evaluate(user => JSON.parse(localStorage.getItem(`landnam-game-state-v1:user:${user}`) ?? 'null'), USER)

test('scan training: mark the dip, confirm the transit, move on to the part try', async () => {
  test.setTimeout(120_000)
  const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    const page = await (await browser.newContext({ viewport: VIEWPORTS.phone, baseURL: 'http://localhost:4320' })).newPage()
    await open(page)
    const confirm = page.getByTestId('tess-verdict-planet')
    await page.getByRole('button', { name: /open galaxy/i }).dispatchEvent('click', undefined, { timeout: 15_000 })
    // First visit opens the data-analysis briefing over the chart (SSL-640); dismiss it like a player would.
    await page.getByTestId('help-close').click({ timeout: 15_000 }).catch(() => {})
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/scan-0.png` })
    await expect(confirm).toBeVisible({ timeout: 30_000 })
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/scan-1-before.png` })
    // Confirming before marking a dip explains itself instead of doing nothing.
    await confirm.click()
    await expect(page.getByTestId('tess-data-provenance')).toContainText(/drag across the dip first/i)
    expect((await state(page))?.player?.flightPlan?.completed?.scan).toBeFalsy()
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/scan-1b-hint.png` })
    const box = (await page.locator('[data-coach-target="tess-chart"] canvas').boundingBox())!
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width * 0.4, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 })
    await page.mouse.up()
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/scan-2-marked.png` })
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect.poll(async () => (await state(page))?.player?.flightPlan?.completed?.scan, { timeout: 10_000 }).toBe(true)
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/scan-3-after.png` })
  } finally { await browser.close().catch(() => {}) }
})
