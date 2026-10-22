import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { VIEWPORTS, expectSound } from '../scenes/helpers'

// This suite deliberately talks to a deployed staging browser origin and its
// real Landnam PocketBase. Fixture scene tests must never create real accounts.
const enabled = process.env.STAGING_PLAYTHROUGH === '1'
const stagingBaseUrl = process.env.STAGING_BASE_URL
const landnamPbUrl = process.env.STAGING_LANDNAM_PB_URL

type PocketBaseAuth = { token: string, record: { id: string, email: string } }
type GameStateRecord = { id: string, state: { player?: { freeOperations?: boolean, missionsDone?: number, flightPlan?: { completed?: Record<string, boolean> } } } }

function runId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }

async function attachScreenshot(page: Page, info: TestInfo, name: string) {
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
}

async function authFromPage(page: Page): Promise<PocketBaseAuth> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('pocketbase_auth')
    if (!raw) throw new Error('shared PocketBase auth was not stored')
    return JSON.parse(raw) as PocketBaseAuth
  })
}

async function loadServerSave(page: Page, userId: string): Promise<GameStateRecord> {
  if (!landnamPbUrl) throw new Error('STAGING_LANDNAM_PB_URL is required')
  return page.evaluate(async ({ base, id }) => {
    const raw = localStorage.getItem('pocketbase_auth_landnam')
    if (!raw) throw new Error('Landnam auth exchange was not stored')
    const auth = JSON.parse(raw) as PocketBaseAuth
    const response = await fetch(`${base.replace(/\/$/, '')}/api/collections/game_states/records/${id}`, { headers: { Authorization: `Bearer ${auth.token}` } })
    if (!response.ok) throw new Error(`game_states read failed: ${response.status}`)
    return response.json() as Promise<GameStateRecord>
  }, { base: landnamPbUrl, id: userId })
}

async function purgeTestAccount(page: Page): Promise<number> {
  if (!landnamPbUrl) return 0
  return page.evaluate(async base => {
    const raw = localStorage.getItem('pocketbase_auth_landnam')
    if (!raw) return 0
    const auth = JSON.parse(raw) as PocketBaseAuth
    const response = await fetch(`${base.replace(/\/$/, '')}/api/landnam-auth/purge-playtest`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } })
    return response.status
  }, landnamPbUrl)
}

async function signUp(page: Page, info: TestInfo, email: string, password: string) {
  await page.goto(`${stagingBaseUrl?.replace(/\/$/, '')}/game?gate=signup`, { waitUntil: 'networkidle' })
  await expect(page.getByTestId('auth-gate-email')).toBeVisible()
  await page.getByRole('tab', { name: 'Sign Up' }).click()
  await page.getByTestId('auth-gate-email').fill(email)
  await page.getByTestId('auth-gate-password').fill(password)
  await page.getByTestId('auth-gate-password-confirmation').fill(password)
  await page.getByTestId('auth-gate-submit').click()
  await expect(page.getByTestId('auth-gate-email')).toBeHidden({ timeout: 90_000 })
  await attachScreenshot(page, info, '01-cold-signup')
  const sharedAuth = await authFromPage(page)
  expect(sharedAuth.record.email).toBe(email)
  return sharedAuth
}

type Snap = { screen: string, missionsDone: number, francs: number }
/** The local save the running game reads and writes, keyed by account. The server copy is checked separately. */
const snap = (page: Page): Promise<Snap | null> => page.evaluate(prefix => {
  const key = Object.keys(localStorage).find(k => k.startsWith(prefix))
  const s = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null
  return s ? { screen: s.screen as string, missionsDone: (s.player?.missionsDone ?? 0) as number, francs: (s.player?.francs ?? 0) as number } : null
}, 'landnam-game-state-v1:user:')

async function tap(page: Page, id: string): Promise<boolean> {
  const el = page.getByTestId(id).first()
  if (await el.count() === 0 || !(await el.isVisible())) return false
  await el.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
  return true
}

test.describe('staging playthrough', () => {
  test.skip(!enabled, 'requires STAGING_PLAYTHROUGH=1 and explicit staging URLs')
  test.setTimeout(180_000)

  test('fresh @landnam.test account persists the M1–M3 handoff to Free Ops', async ({ page }, info) => {
    if (!stagingBaseUrl || !landnamPbUrl) throw new Error('STAGING_BASE_URL and STAGING_LANDNAM_PB_URL are required')
    const events: string[] = []
    const email = `staging-run-${runId()}@landnam.test`
    const password = `Staging-${runId()}-pass!`
    page.on('requestfailed', request => events.push(`FAILED ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`))
    page.on('response', async response => {
      if (response.status() < 400) return
      const body = await response.text().catch(() => '')
      events.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()} ${body.slice(0, 300)}`)
    })

    try {
      const sharedAuth = await signUp(page, info, email, password)

      await page.getByTestId('intro-begin-btn').click()
      // One buildable structure: Base opens straight into placement with a single slot (the picker chip is hidden).
      await page.getByRole('button', { name: 'Place Launchpad here' }).click({ timeout: 30_000 })
      await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })

      // This minimal first slice exercises the shipped M1–M3 completion
      // control; individual mining, scan and part interactions remain a
      // follow-up slice rather than an admin-written save fixture.
      await page.getByTestId('flight-plan-objective').click()
      await page.getByTestId('flight-plan-skip').click()
      await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
      await attachScreenshot(page, info, '02-free-ops')

      await expect.poll(async () => loadServerSave(page, sharedAuth.record.id), { timeout: 30_000 }).toMatchObject({
        id: sharedAuth.record.id,
        state: { player: { freeOperations: true, flightPlan: { completed: { mining: true, scan: true, part: true } } } },
      })

      await page.reload({ waitUntil: 'networkidle' })
      await expect(page.getByTestId('auth-gate-email')).toBeHidden({ timeout: 30_000 })
      await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
      await attachScreenshot(page, info, '03-reload-persisted')
    } finally {
      const status = await purgeTestAccount(page).catch(() => 0)
      events.push(`purge-playtest ${status}`)
      if (process.env.STAGING_HTTP_LOG) console.log(events.join('\n'))
      await info.attach('browser-http-log', { body: events.join('\n'), contentType: 'text/plain' })
      expect(status, 'staging test account must be disposed').toBe(200)
    }
  })
})

// SSL-626: the authenticated playthrough the release gate asks for, at the three required sizes. It runs on the staging
// Worker, which is the same build as production with NEXT_PUBLIC_LANDNAM_ENV=staging, against the live Landnam and shared
// PocketBase. Each size signs up its own disposable @landnam.test account and flies one real run (launch, flight,
// mining, delivery, debrief): the offered contract, or a Free run when the starter contract is on a build hold (SSL-647).
// It then checks the server copy of the save, reloads, and purges the account.
// The sky clock is pinned inside the Orionids window (25 Oct, 14:00 local: an ordinary window launch catches 2 fragments).
// The laser itself is not played: the dev SKIP MINING button (enabled on staging only) replaces it, as in the local pathways.
const WINDOW_NOW = new Date(2026, 9, 25, 14, 0, 0).getTime()

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`staging run ${vp}`, () => {
    test.skip(!enabled, 'requires STAGING_PLAYTHROUGH=1 and explicit staging URLs')
    test.setTimeout(300_000)
    test.use({ viewport: size, hasTouch: vp !== 'desktop' })

    test(`fresh account signs up, flies one run and keeps it after reload at ${size.width}x${size.height}`, async ({ page }, info) => {
      if (!stagingBaseUrl || !landnamPbUrl) throw new Error('STAGING_BASE_URL and STAGING_LANDNAM_PB_URL are required')
      const events: string[] = []
      const errors: string[] = []
      const email = `staging-${vp}-${runId()}@landnam.test`
      const password = `Staging-${runId()}-pass!`
      page.on('pageerror', e => errors.push(e.message))
      page.on('requestfailed', request => events.push(`FAILED ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`))
      page.on('response', async response => {
        if (response.status() < 400) return
        const body = await response.text().catch(() => '')
        events.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()} ${body.slice(0, 300)}`)
      })
      await page.addInitScript(at => {
        (window as unknown as { __LANDNAM_DEV_NOW: number }).__LANDNAM_DEV_NOW = at
      }, WINDOW_NOW)
      const shot = async (name: string) => {
        await page.screenshot({ path: info.outputPath(`${name}-${vp}.png`) })
        await attachScreenshot(page, info, `${name}-${vp}`)
      }
      const path: string[] = []

      // Two things on a staging page are not the game a player gets. The DEV badge is dev tooling that production turns off,
      // so it is hidden for the structural checks. A PostHog survey card can appear over any screen: the card's own sizes
      // are checked, then it is skipped, as a player does.
      const surveyProblems: string[] = []
      const sound = async () => {
        const card = page.getByTestId('survey-sheet')
        if (await card.isVisible().catch(() => false)) {
          await shot('survey')
          surveyProblems.push(...await card.evaluate(el => {
            const bad: string[] = []
            for (const b of el.querySelectorAll('button')) {
              const r = b.getBoundingClientRect()
              if (r.width < 43.5 || r.height < 43.5) bad.push(`${Math.round(r.width)}x${Math.round(r.height)} button:${(b.textContent ?? '').trim().slice(0, 12)}`)
            }
            for (const t of el.querySelectorAll('*')) {
              const own = [...t.childNodes].some(n => n.nodeType === 3 && (n.textContent ?? '').trim())
              if (own && parseFloat(getComputedStyle(t).fontSize) < 13.9) bad.push(`${getComputedStyle(t).fontSize} text:${(t.textContent ?? '').trim().slice(0, 12)}`)
            }
            // Where the screen has room, every answer shows without scrolling inside the card.
            if (innerHeight > 600 && el.scrollHeight - el.clientHeight > 1) bad.push(`${el.scrollHeight - el.clientHeight}px of the card is hidden below its edge`)
            return bad
          }))
          // Another overlay can open over the card after it shows (a Base prompt is portaled above the canvas). Not a failure here: recorded.
          const skipCovered = await card.getByRole('button', { name: 'SKIP' }).evaluate(el => {
            const r = el.getBoundingClientRect()
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            return !top || !el.contains(top)
          })
          info.annotations.push({ type: 'survey', description: skipCovered ? 'a survey card appeared with Skip covered by another overlay, then was skipped' : 'a survey card appeared and was skipped' })
          await card.getByRole('button', { name: 'SKIP' }).dispatchEvent('click').catch(() => {})
          await expect(card).toBeHidden({ timeout: 5000 })
        }
        await page.addStyleTag({ content: '[data-testid="dev-shortcuts-toggle"] { display: none !important; }' })
        await expectSound(page, errors)
      }

      try {
        const sharedAuth = await signUp(page, info, email, password)
        // A window resize can silently no-op, so the real viewport is checked, not assumed.
        expect(await page.evaluate(() => innerWidth), 'real viewport width').toBe(size.width)

        await page.getByTestId('intro-begin-btn').click()
        await page.getByRole('button', { name: 'Place Launchpad here' }).click({ timeout: 30_000 })
        await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
        await expect(page.getByTestId('building-launchpad')).toBeVisible({ timeout: 20_000 })
        await page.waitForTimeout(1500)
        await shot('base')
        await sound()
        const start = await snap(page)
        expect(start?.francs, 'a new account starts with 9,000,000 francs').toBe(9_000_000)

        // The coach says "Tap the tower": it opens the contracts. Accept the first one and review the launch.
        await tap(page, 'building-launchpad-hit')
        await expect(page.getByTestId('builder-choose-contract')).toBeVisible({ timeout: 15_000 })
        await tap(page, 'builder-choose-contract')
        const accepts = page.locator('[data-testid^="mission-accept-"]')
        const prepare = page.getByTestId('prepare-launch-btn')
        const launch = page.getByTestId('launch-btn')
        await expect(accepts.first()).toBeVisible({ timeout: 20_000 })
        await accepts.first().dispatchEvent('click')
        await expect(prepare.or(launch)).toBeVisible({ timeout: 30_000 })
        await page.waitForTimeout(800)
        // The free Explorer carries 6U and a starter contract can ask for up to 8U, which shows a build hold on the review.
        // Customize cannot clear it (its Capacity chip counts the cargo-hold part, the launch check does not), so a new
        // player is better off with a Free Ops run: skip the guided plan and start a Free run from the board.
        if (await page.getByTestId('plan-clearance').count() > 0) {
          const hold = (await page.getByTestId('plan-clearance').innerText()).slice(0, 100)
          path.push(`hold:${hold}`)
          info.annotations.push({ type: 'finding', description: `the only starter contract cannot be flown by the free Explorer. ${hold}` })
          await shot('launch-review-hold')
          await tap(page, 'top-bar-back')
          await expect(page.getByTestId('mission-board')).toBeVisible({ timeout: 15_000 })
          await tap(page, 'mission-board-close')
          await expect(page.getByTestId('rocket-builder')).toBeVisible({ timeout: 15_000 })
          await tap(page, 'top-bar-back')
          await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 15_000 })
          await page.getByTestId('flight-plan-objective').click()
          await page.getByTestId('flight-plan-skip').click()
          await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
          await tap(page, 'building-launchpad-hit')
          // The unflown contract is still planned, so the pad offers "Change mission" rather than "Choose a mission".
          const chooser = page.locator('[data-testid="builder-choose-contract"], [data-testid="launchpad-new-mission-btn"], [data-testid="rocket-builder-target"]').filter({ visible: true }).first()
          await expect(chooser).toBeVisible({ timeout: 15_000 })
          await chooser.dispatchEvent('click')
          await expect(page.getByTestId('mission-board')).toBeVisible({ timeout: 15_000 })
          await tap(page, 'mission-board-tab-free')
          await expect(page.getByTestId('mission-board-free')).toBeVisible({ timeout: 15_000 })
          const site = page.locator('[data-testid^="map-node-"]').filter({ visible: true }).first()
          await expect(site).toBeVisible({ timeout: 15_000 })
          await site.dispatchEvent('click')
          const startRun = page.getByTestId('free-run-start')
          await expect(startRun).toBeEnabled({ timeout: 15_000 })
          await startRun.dispatchEvent('click')
          await expect(prepare.or(launch)).toBeVisible({ timeout: 30_000 })
          await page.waitForTimeout(800)
          path.push('free-ops')
        }
        await shot('launch-review')
        await sound()
        if (await prepare.isVisible()) await prepare.dispatchEvent('click')
        await expect(launch).toBeVisible({ timeout: 20_000 })
        await launch.dispatchEvent('click')
        path.push('launch')

        // Fly the contract the way a player does, one screen at a time, until the debrief has paid out and Base is back.
        let skipped = false
        let shotTransit = false
        let shotMining = false
        let shotDebrief = false
        let toastSeen = false
        const t0 = Date.now()
        for (;;) {
          if (Date.now() - t0 > 200_000) throw new Error(`the flight did not finish in 200 s. Path: ${path.join(' > ')}`)
          const s = await snap(page)
          // The debrief returns to the pad on some paths and to Base on others; both mean the run is over.
          if (s && s.missionsDone >= 1 && (s.screen === 'hub' || s.screen === 'launchpad')) break
          const screen = s?.screen ?? 'none'
          if (path[path.length - 1] !== screen) path.push(screen)

          if (!toastSeen && await page.locator('.toast-item', { hasText: /Orionid fragments caught on the way up/ }).count() > 0) {
            toastSeen = true
            await expect(page.locator('.toast-item', { hasText: /2 Orionid fragments/ })).toBeVisible()
          }
          if (await tap(page, 'launch-sequence-skip-btn') || await tap(page, 'tutorial-complete-close') || await tap(page, 'delivery-confirm')) {
            await page.waitForTimeout(500)
            continue
          }
          if (screen === 'transit') {
            if (!shotTransit && await page.getByTestId('transit-screen').isVisible()) {
              shotTransit = true
              await shot('transit')
              await sound()
            }
            await page.waitForTimeout(1000)
            continue
          }
          if (screen === 'mining') {
            if (!shotMining) { shotMining = true; await page.waitForTimeout(1500); await shot('mining') }
            // SKIP MINING shows only with ?dev=1, which in-app navigation drops: reload the route once, resuming from the save.
            if (!(await tap(page, 'dev-skip-mining-btn')) && !skipped && !page.url().includes('dev=1')) { skipped = true; await page.goto('/game/mining?dev=1') }
          } else if (screen === 'delivery') {
            const next = page.locator('[data-testid^="delivery-"]:not([data-testid*="pause"]):not([data-testid*="back"])').first()
            if (await next.count()) await next.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
          } else if (screen === 'debrief') {
            if (!shotDebrief) { shotDebrief = true; await page.waitForTimeout(1200); await shot('debrief'); await sound() }
            const next = page.getByRole('button', { name: /^(continue|collect|done|skip|close|deliver|back)/i }).first()
            if (await next.count() && await next.isVisible()) await next.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
          } else if (screen !== 'hub') {
            const next = page.getByRole('button', { name: /^(continue|collect|done|skip|close|deliver)/i }).first()
            if (await next.count() && await next.isVisible()) await next.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
          }
          await page.waitForTimeout(700)
        }
        info.annotations.push({ type: 'path', description: path.join(' > ') })
        expect(toastSeen, 'the Orionid fragment toast showed on the launch').toBe(true)
        if ((await snap(page))?.screen === 'launchpad') {
          await tap(page, 'top-bar-back')
          await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 20_000 })
        }
        await page.waitForTimeout(1500)
        await shot('base-after')
        await sound()
        expect(surveyProblems, 'any survey card that appeared meets the 14px and 44px floors').toEqual([])

        const after = await snap(page)
        expect(after?.missionsDone).toBeGreaterThanOrEqual(1)
        await expect.poll(async () => (await loadServerSave(page, sharedAuth.record.id)).state.player, { timeout: 30_000 }).toMatchObject({ missionsDone: expect.any(Number) })
        const server = await loadServerSave(page, sharedAuth.record.id)
        expect(server.state.player?.missionsDone, 'the server save has the finished contract').toBeGreaterThanOrEqual(1)

        await page.reload({ waitUntil: 'networkidle' })
        await expect(page.getByTestId('auth-gate-email')).toBeHidden({ timeout: 30_000 })
        await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
        await expect(page.getByTestId('building-launchpad')).toBeVisible({ timeout: 20_000 })
        await shot('reload')
        expect((await snap(page))?.missionsDone, 'the finished contract survives a reload').toBeGreaterThanOrEqual(1)
      } finally {
        const status = await purgeTestAccount(page).catch(() => 0)
        events.push(`purge-playtest ${status}`)
        events.push(`path ${path.join(' > ')}`)
        if (process.env.STAGING_HTTP_LOG) console.log(events.join('\n'))
        await info.attach('browser-http-log', { body: events.join('\n'), contentType: 'text/plain' })
        expect(status, 'staging test account must be disposed').toBe(200)
      }
    })
  })
}
