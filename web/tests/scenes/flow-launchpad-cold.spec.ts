import { expect, test } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-476: the real game route (not the stage). A save whose last screen was the underground must still open the
// Launchpad on a cold load of /game/launchpad, and again after a reload.
const seededToken = () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`launchpad cold load ${vp}`, () => {
    test.use({ viewport: size })

    test('cold /game/launchpad with a subsurface save renders the Launchpad, also after reload', async ({ page }, info) => {
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
        localStorage.setItem('landnam-game-state-v1:user:e2euser0000001', JSON.stringify({ screen: 'hub-subsurface', player: { placed: ['launchpad', 'refinery'], missionsDone: 1 } }))
      })
      await page.goto('/game/launchpad')
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/game/launchpad')
      await expect(page.getByTestId('hub-subsurface-view')).toHaveCount(0)
      await expect(page.getByTestId('subsurface-excavate-prompt')).toHaveCount(0)
      await expect(page.getByTestId('launchpad-focus-screen')).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await page.screenshot({ path: info.outputPath(`launchpad-cold-${vp}.png`) })
      await page.reload()
      await page.waitForTimeout(1500)
      expect(new URL(page.url()).pathname).toBe('/game/launchpad')
      await expect(page.getByTestId('launchpad-focus-screen')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('hub-subsurface-view')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`launchpad-reload-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
