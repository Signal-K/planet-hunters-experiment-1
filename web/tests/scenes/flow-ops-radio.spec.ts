import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-442: Ops radio skin on the Flight Plan strip, Ops briefing on the "?" sheet, Mission patch shelf in Menu > Training.
const seededToken = () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'e2euser0000001', exp: 4102444800 })}.sig`
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`ops radio ${vp}`, () => {
    test.use({ viewport: size })

    test('strip shows the OPS badge and call-sign kicker; text 14px+, badge 44px, static under reduced motion', async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await stage(page, 'm1-hub', { chrome: true, patch: { flightPlan: { completed: {}, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const badge = page.getByTestId('ops-badge')
      await expect(badge).toBeVisible()
      const box = (await badge.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      await expect(page.getByTestId('flight-plan-kicker')).toHaveText(/mining Ops · Step 1\/3/i)
      const m = await page.evaluate(() => ({
        kicker: parseFloat(getComputedStyle(document.querySelector('[data-testid=flight-plan-kicker]')!).fontSize),
        action: parseFloat(getComputedStyle(document.querySelector('.flight-plan-action')!).fontSize),
        anim: getComputedStyle(document.querySelector('.ops-bars i')!).animationName,
      }))
      expect(m.kicker).toBeGreaterThanOrEqual(14)
      expect(m.action).toBeGreaterThanOrEqual(14)
      expect(m.anim).toBe('none')
      await page.screenshot({ path: info.outputPath(`ops-strip-${vp}.png`) })
    })

    test('Menu > Training is a patch shelf with 44px Replay targets', async ({ page }, info) => {
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
      }, [JSON.stringify({ screen: 'hub', player: { placed: ['launchpad'], missionsDone: 1, flightPlan: { completed: { mining: true }, hidden: true } } })])
      await page.goto('/game')
      await page.getByTestId('settings-button').click({ timeout: 30_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const shelf = page.getByTestId('training-patch-shelf')
      await shelf.scrollIntoViewIfNeeded()
      await expect(shelf.locator('.patch')).toHaveCount(3)
      await expect(shelf.locator('.patch[data-state="done"]')).toHaveCount(1)
      await expect(shelf.locator('.patch[data-state="active"]')).toHaveCount(1)
      for (const b of await shelf.getByRole('button', { name: 'Replay' }).all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: info.outputPath(`patch-shelf-${vp}.png`) })
    })

    test('"?" sheet reads as an Ops briefing with numbered transmissions', async ({ page }, info) => {
      await stage(page, 'ui-instrument-hub')
      await page.getByTestId('help-button').first().click()
      await expect(page.getByTestId('help-sheet')).toBeVisible()
      await expect(page.getByText('OPS BRIEFING')).toBeVisible()
      await expect(page.getByTestId('help-card').first()).toContainText('01')
      const hit = await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid=help-sheet]')!
        const r = sheet.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20)
        return { box: [r.left, r.top, r.width, r.height], covered: !sheet.contains(top), top: top?.tagName }
      })
      expect(hit.covered, JSON.stringify(hit)).toBe(false)
      await page.screenshot({ path: info.outputPath(`ops-briefing-${vp}.png`) })
    })
  })
}
