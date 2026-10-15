import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: every other pathway spec starts from a seeded post-onboarding save with the coach hidden, which is how the first
// minutes of a brand-new account went untested. This one starts with NO saved game and the coach on, and checks what a new
// player sees: the Launch button is reachable (not under the coach strip), parts are optional, and nothing is bought.
test.skip(!process.env.PLAYTHROUGH, 'slow; run with PLAYTHROUGH=1')
const USER = 'e2efresh0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const state = (page: Page) => page.evaluate(u => {
  const s = JSON.parse(localStorage.getItem(`landnam-game-state-v1:user:${u}`) ?? 'null')
  return s ? { screen: s.screen as string, francs: s.player?.francs as number, placed: s.player?.placed as string[], done: s.player?.missionsDone as number } : null
}, USER)

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`a brand-new account can accept a contract and launch the free Explorer without buying parts (${vp})`, async () => {
    test.setTimeout(120_000)
    const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
    try {
      const page = await (await browser.newContext({ viewport: size, baseURL: 'http://localhost:3001', hasTouch: vp !== 'desktop' })).newPage()
      const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'fresh@example.test', verified: true }
      await page.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, k: string, ...r: unknown[]) { return /webgl/.test(k) ? null : (g as (...a: unknown[]) => unknown).call(this, k, ...r) } as typeof g })
      await page.route(/\/api\/(collections|realtime|health)/, r => /auth-refresh/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) }) : r.abort('connectionrefused'))
      await page.addInitScript(([t, r]) => { if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', '1'); localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) })) }, [token(), JSON.stringify(record)])
      await page.goto('/game')
      await expect.poll(async () => (await state(page))?.screen, { timeout: 30_000 }).toBeTruthy()
      const start = (await state(page))!
      expect(start.francs).toBe(9_000_000)

      await page.getByTestId('hub-new-mission-btn').dispatchEvent('click')
      await page.locator('[data-testid^="mission-accept-"]').first().dispatchEvent('click')
      const launch = page.locator('[data-testid="launch-btn"], [data-testid="prepare-launch-btn"]').first()
      await expect(launch).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(800)
      if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/fresh-review-${vp}.png` })
      // The Launch button must be the thing under its own centre point: nothing (the coach strip) may cover it.
      const covered = await launch.evaluate(el => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !(top && (el === top || el.contains(top))) })
      expect(covered, 'the Launch button is covered by another element').toBe(false)
      await expect(launch).toBeEnabled()
      // The parts shop is closed until asked for.
      await expect(page.getByTestId('rocket-builder-options')).toHaveCount(0)

      await launch.dispatchEvent('click')
      await expect.poll(async () => (await state(page))?.screen, { timeout: 60_000 }).toMatch(/fab|transit|rocket-buy/)
      const after = await state(page)
      expect(after!.francs, 'launching the free Explorer must not spend francs').toBe(9_000_000)

      // Silo and Exchange are not offered before the first run is flown.
      await page.goto('/game')
      await page.waitForTimeout(1500)
    } finally { await browser.close().catch(() => {}) }
  })
}
