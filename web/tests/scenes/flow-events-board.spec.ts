import { chromium, test, expect } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: the mission board's Events tab (Orionids hero plus World Space Week cards) opens and fits on phone, landscape and desktop.
test.skip(!process.env.PLAYTHROUGH)
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`
for (const [vp, size] of Object.entries(VIEWPORTS)) test(`events ${vp}`, async () => {
  test.setTimeout(90000)
  const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const page = await (await browser.newContext({ viewport: size, baseURL: 'http://localhost:3001' })).newPage()
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, k: string, ...r: unknown[]) { return /webgl/.test(k) ? null : (g as any).call(this, k, ...r) } as any })
  await page.route(/\/api\/(collections|realtime|health)/, r => /auth-refresh/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) }) : r.abort('connectionrefused'))
  const save = { screen: 'hub', player: { placed: ['launchpad', 'surface-silo', 'market'], placementPlots: { launchpad: 0, 'surface-silo': 2, market: 1 }, missionsDone: 6, francs: 60_000_000, flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true } } }
  await page.addInitScript(([s, t, r, u]) => { if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', '1'); localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) })); localStorage.setItem(`landnam-game-state-v1:user:${u}`, s as string) }, [JSON.stringify(save), token(), JSON.stringify(record), USER])
  await page.goto('/game'); await page.waitForTimeout(3000)
  await page.getByTestId('hub-new-mission-btn').dispatchEvent('click')
  await page.getByTestId('mission-board-tab-events').dispatchEvent('click')
  await expect(page.getByTestId('events-orionids')).toBeVisible({ timeout: 15000 })
  expect(await page.evaluate(() => innerWidth)).toBe(size.width)
  await page.waitForTimeout(800)
  await expect(page.getByTestId('events-card-draconids-2026')).toBeAttached()
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/events-${vp}.png` })
  await browser.close()
})
