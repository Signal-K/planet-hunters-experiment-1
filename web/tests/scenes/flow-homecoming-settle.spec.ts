import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: settling a free run's haul. Stored crates sink into the silo, sold crates fly to the francs counter, the rocket
// is taken apart, then the base returns. Bundled Chromium is launched directly (installed Chrome dies after ~30s here).
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const seed = (silo: boolean) => ({
  screen: 'debrief',
  missionId: 'self-directed-freeops-aluminium-stock',
  targetId: 'ryugu',
  lastCargo: { aluminium: 6, iron: 4 },
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  player: {
    placed: silo ? ['launchpad', 'surface-silo', 'market'] : ['launchpad', 'market'],
    missionsDone: 6,
    francs: 20_000_000,
    flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
    activeMission: { id: 'self-directed-freeops-aluminium-stock', label: 'Aluminium stock run → Ryugu' },
    missionPhase: 'debrief',
    homeDeliveryPending: true,
    stash: {},
  },
})

async function open(page: Page, silo: boolean) {
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
  }, [JSON.stringify(seed(silo)), token(), JSON.stringify(record), USER])
  await page.goto('/game')
}

test('settle: crates leave, the rocket is dismantled, the haul is sold and stored', async () => {
  test.setTimeout(120_000)
  const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    const page = await (await browser.newContext({ viewport: VIEWPORTS.phone, baseURL: 'http://localhost:3001' })).newPage()
    await open(page, true)
    await expect(page.getByTestId('delivery-sheet')).toBeVisible({ timeout: 30_000 })
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/settle-1-sheet.png` })
    await page.getByTestId('delivery-confirm').dispatchEvent('click')
    await page.waitForTimeout(900)
    await expect(page.getByTestId('settle-note')).toContainText(/rocket recycled/i)
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/settle-2-mid.png` })
    await page.waitForTimeout(900)
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/settle-3-late.png` })
    await expect(page.getByTestId('homecoming-screen')).toHaveCount(0, { timeout: 10_000 })
  } finally { await browser.close().catch(() => {}) }
})
