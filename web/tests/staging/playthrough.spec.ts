import { expect, test, type Page, type TestInfo } from '@playwright/test'

// This suite deliberately talks to a deployed staging browser origin and its
// real Landnam PocketBase. Fixture scene tests must never create real accounts.
const enabled = process.env.STAGING_PLAYTHROUGH === '1'
const stagingBaseUrl = process.env.STAGING_BASE_URL
const landnamPbUrl = process.env.STAGING_LANDNAM_PB_URL

type PocketBaseAuth = { token: string, record: { id: string, email: string } }
type GameStateRecord = { id: string, state: { player?: { freeOperations?: boolean, flightPlan?: { completed?: Record<string, boolean> } } } }

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
      await page.goto(`${stagingBaseUrl.replace(/\/$/, '')}/game?gate=signup`, { waitUntil: 'networkidle' })
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
