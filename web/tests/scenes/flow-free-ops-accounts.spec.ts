import { expect, test } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-449: real /game route, signed-in account, fresh vs returning save. Both reach every self-directed branch
// from the pad with no contract accepted.
const seededToken = () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
}
const BRANCHES = ['mining', 'build', 'control-station', 'market', 'contracts']
const SAVES = {
  fresh: { screen: 'launchpad', player: { placed: ['launchpad'], missionsDone: 3 } },
  returning: { screen: 'hub-subsurface', player: { placed: ['launchpad', 'refinery'], missionsDone: 6 } },
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  for (const [kind, save] of Object.entries(SAVES)) {
    test.describe(`free ops ${kind} account ${vp}`, () => {
      test.use({ viewport: size })
      test(`${kind} save reaches every branch without a contract`, async ({ page }, info) => {
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
        }, [JSON.stringify(save)])
        await page.goto('/game/launchpad')
        await expect(page.getByTestId('launchpad-focus-screen')).toBeVisible({ timeout: 30_000 })
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        await page.getByTestId('launchpad-new-mission-btn').click()
        await expect(page.getByTestId('launchpad-new-mission-menu')).toBeVisible()
        for (const b of BRANCHES) await expect(page.getByTestId(`launchpad-new-mission-${b}-btn`), b).toBeVisible()
        await page.screenshot({ path: info.outputPath(`free-ops-${kind}-${vp}.png`) })
        await page.getByTestId('launchpad-new-mission-mining-btn').click()
        await expect(page.getByTestId('launchpad-operation-brief-mining')).toContainText(/no client/i)
      })
    })
  }
}
