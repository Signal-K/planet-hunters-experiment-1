import { expect, test, type Page } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-442: Ops radio skin, shared Ops briefing and the Menu mission patch shelf.
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
      await expect(page.getByTestId('flight-plan-kicker')).toHaveText(/mining Ops · Step 1\/6/i)
      const m = await page.evaluate(() => ({
        kicker: parseFloat(getComputedStyle(document.querySelector('[data-testid=flight-plan-kicker]')!).fontSize),
        action: parseFloat(getComputedStyle(document.querySelector('.flight-plan-action')!).fontSize),
        anim: getComputedStyle(document.querySelector('.ops-bars i')!).animationName,
      }))
      expect(m.kicker).toBeGreaterThanOrEqual(14)
      expect(m.action).toBeGreaterThanOrEqual(14)
      expect(m.anim).toBe('none')
      const geometry = await page.evaluate(() => {
        const plan = document.querySelector<HTMLElement>('[data-testid=flight-plan]')!.getBoundingClientRect()
        const screen = document.querySelector<HTMLElement>('.game-screen-area')!.getBoundingClientRect()
        return { planWidth: plan.width, planTop: plan.top, planLeft: plan.left, screenHeight: screen.height }
      })
      // Narrow screens put the strip under the HUD row; wide ones share the row, between the gear/clock and the francs chips.
      if (size.width < 600) expect(geometry.planTop).toBeGreaterThanOrEqual(60)
      else expect(geometry.planLeft).toBeGreaterThanOrEqual(190)
      expect(geometry.planWidth).toBeLessThanOrEqual(Math.min(560, size.width - 16) + 1)
      await page.getByTestId('flight-plan-hide').click()
      await expect(page.getByTestId('flight-plan')).toHaveCount(0)
      await expect(page.getByTestId('flight-plan-chip')).toHaveText('?')
      const chip = (await page.getByTestId('flight-plan-chip').boundingBox())!
      expect(chip.width).toBeGreaterThanOrEqual(44)
      expect(chip.height).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: info.outputPath(`ops-chip-${vp}.png`) })
      expect(chip.x).toBeLessThan(size.width / 3)
      expect(Math.abs(await page.locator('.game-screen-area').evaluate(el => el.getBoundingClientRect().height) - geometry.screenHeight)).toBeLessThanOrEqual(1)
      await page.getByTestId('flight-plan-chip').click()
      await expect(page.getByTestId('flight-plan')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`ops-strip-${vp}.png`) })
    })

    test('Menu > Training shows one patch per try and 44px replay/skip controls', async ({ page }, info) => {
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
      await page.getByTestId('hub-menu-btn').click({ timeout: 30_000 })
      await page.getByTestId('base-menu-settings').click()
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const shelf = page.getByTestId('training-patch-shelf')
      await shelf.scrollIntoViewIfNeeded()
      await expect(shelf.locator('.patch')).toHaveCount(4)
      // Mining is done, and Free Ops opens with the launchpad, so its patch reads done too.
      await expect(shelf.locator('.patch[data-state="done"]')).toHaveCount(2)
      await expect(shelf.locator('.patch[data-state="active"]')).toHaveCount(1)
      await expect(shelf.locator('.patch-ring-segment')).toHaveCount(10)
      await expect(shelf.locator('.patch').nth(0).locator('[data-stitched="true"]')).toHaveCount(6)
      await expect(shelf.locator('.patch').nth(1).locator('[data-stitched="true"]')).toHaveCount(0)
      await expect(shelf.getByText('Unlocked')).toBeVisible()
      for (const button of await shelf.getByRole('button', { name: 'Replay' }).all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      // Free Ops is already unlocked here (it opens with the launchpad), so there is nothing left to skip.
      await expect(page.getByTestId('skip-training')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`patch-shelf-${vp}.png`) })
    })

    test('"?" sheet reads as an Ops briefing with numbered transmissions', async ({ page }, info) => {
      await stage(page, 'ui-instrument-hub')
      // The Control Station opens its help once on the first visit; the "?" is the path after that.
      await expect(page.getByTestId('help-sheet')).toBeVisible()
      await expect(page.getByText('OPS BRIEFING')).toBeVisible()
      await expect(page.getByTestId('help-card').first()).toContainText('01')
      const hit = await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid=help-sheet]')!
        const scrim = document.querySelector('[data-testid=help-scrim]')!
        const r = sheet.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20)
        const s = getComputedStyle(scrim)
        return { box: [r.left, r.top, r.width, r.height], covered: !sheet.contains(top), top: top?.tagName, backdrop: s.backgroundColor }
      })
      expect(hit.covered, JSON.stringify(hit)).toBe(false)
      if (vp === 'desktop') {
        expect(hit.box[0]).toBeGreaterThan(size.width * 0.65)
        expect(hit.box[0] + hit.box[2]).toBe(size.width)
        expect(hit.backdrop).toBe('rgba(0, 0, 0, 0)')
      }
      await page.screenshot({ path: info.outputPath(`ops-briefing-${vp}.png`) })
    })

    test('Show me uses an Ops dock with a 44px skip control and static reduced-motion brackets', async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await openLive(page, { screen: 'hub', tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true }, player: { placed: ['launchpad'], missionsDone: 0 } })
      const scenarioReady = await page.evaluate(() => {
        const bridge = (window as typeof window & { __landnam?: { scenario: (key: string) => boolean } }).__landnam
        return bridge?.scenario('m1-mining') ?? false
      })
      expect(scenarioReady).toBe(true)
      await expect(page.getByTestId('help-button')).toBeVisible()
      await page.getByTestId('help-button').click()
      await page.getByTestId('help-show-me').click()
      const hint = page.getByTestId('help-coach-hint')
      await expect(hint).toBeVisible()
      await expect(hint).toContainText('OPS')
      await expect(hint).toContainText('Show me · 1 of 1')
      const metrics = await page.evaluate(() => {
        const skip = document.querySelector<HTMLElement>('[data-testid="help-coach-stop"]')!
        const bracket = document.querySelector<HTMLElement>('.help-coach-brackets')!
        const dock = document.querySelector<HTMLElement>('[data-testid="help-coach-hint"]')!
        return {
          skipHeight: skip.getBoundingClientRect().height,
          bracketMotion: getComputedStyle(bracket).animationName,
          kickerSize: parseFloat(getComputedStyle(dock.querySelector('.help-coach-dock-kicker')!).fontSize),
        }
      })
      expect(metrics.skipHeight).toBeGreaterThanOrEqual(44)
      expect(metrics.bracketMotion).toBe('none')
      expect(metrics.kickerSize).toBeGreaterThanOrEqual(14)
      await page.screenshot({ path: info.outputPath(`show-me-dock-${vp}.png`) })
    })

    test('TESS Show me docks in Flight Plan and starts only on request', async ({ page }, info) => {
      // Desktop CI boots the live hub under software GL. The assertions finish, then the screenshot overruns the 45s default.
      test.setTimeout(90_000)
      await openLive(page, { screen: 'hub', tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true }, player: { placed: ['launchpad'], missionsDone: 0 } })
      const scenarioReady = await page.evaluate(() => {
        const bridge = (window as typeof window & { __landnam?: { scenario: (key: string) => boolean; patch: (player: object) => void } }).__landnam
        const ready = bridge?.scenario('ui-tess-discovery') ?? false
        bridge?.patch({ freeOperations: false, flightPlan: { completed: { mining: true }, hidden: false } })
        return ready
      })
      expect(scenarioReady).toBe(true)
      await expect(page.getByTestId('flight-plan-slot')).toHaveCount(1)
      await expect(page.getByTestId('help-coach')).toHaveCount(0)
      // TESS opens its help on the first visit, so the sheet is already up.
      await expect(page.getByTestId('help-sheet')).toBeVisible()
      await page.getByTestId('help-show-me').click()
      const hint = page.getByTestId('help-coach-hint')
      await expect(hint).toBeVisible()
      await expect(hint).toContainText('Show me · 1 of 2')
      expect(await hint.evaluate(el => Boolean(el.closest('[data-testid="flight-plan-slot"]')))).toBe(true)
      await page.screenshot({ path: info.outputPath(`tess-show-me-${vp}.png`) })
    })
  })
}
