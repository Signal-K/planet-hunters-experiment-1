import { expect, test } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-460: the real game route (not the stage). A cold load of /game/mission-history must keep the Mission Log tray
// over the Base (and the URL), even when the saved screen is another one, and again after a reload.
const seededToken = () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`mission log cold load ${vp}`, () => {
    test.use({ viewport: size })

    test('cold /game/mission-history keeps the tray and the URL, also after reload', async ({ page }, info) => {
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      // The session is fake, so keep any PocketBase (whatever host the env points at) from rejecting it with a 401:
      // auth-refresh echoes the seeded session, every other backend call fails like an offline network.
      const record = { id: 'e2euser0000001', collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
      await page.route(/\/api\/(collections|realtime|health)/, route => {
        const url = route.request().url()
        if (!/auth-refresh/.test(url)) return route.abort('connectionrefused')
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: seededToken(), record }) })
      })
      // No account-free play: seed a signed-in session (client-side JWT exp check only) and that account's private save.
      await page.addInitScript(() => {
        if (localStorage.getItem('seeded')) return
        localStorage.setItem('seeded', '1')
        const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
        const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
        const record = { id: 'e2euser0000001', collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
        localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record }))
        localStorage.setItem('landnam-game-state-v1:user:e2euser0000001', JSON.stringify({ screen: 'hub', player: { placed: ['launchpad'], missionsDone: 1 } }))
      })
      await page.goto('/game/mission-history')
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/game/mission-history')
      await expect(page.getByTestId('mission-history-page')).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await page.screenshot({ path: info.outputPath(`camera-mission-log-cold-${vp}.png`) })
      await page.reload()
      await page.waitForTimeout(1500)
      expect(new URL(page.url()).pathname).toBe('/game/mission-history')
      await expect(page.getByTestId('mission-history-page')).toBeVisible({ timeout: 30_000 })
      await page.screenshot({ path: info.outputPath(`camera-mission-log-reload-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
