import { expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-674: finishing a survey flight to a world the player discovered stamps today as community research.
// Drives the real debrief collect in the full app from a seeded save, then reads the Control Station plate.
const USER = 'e2euser0000002'
const KEY = `landnam-game-state-v1:user:${USER}`
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

// tessCandidateToExoplanetTarget for TOI 4242.01, as runtimeCatalog.test.ts builds it.
const TARGET = {
  id: 'exo-subject-42', name: 'TOI 4242.01', type: 'exoplanet', orbit: 5, difficulty: 'L3',
  brief: 'TOI-4242.01 candidate in TESS field.', minerals: ['iron', 'nickel'], archetype: 'M',
  planetRadiusEarth: 0, periodDays: 2.4, starTeffK: 9500,
}
const MISSION_ID = `exo-survey-${TARGET.id}`

const save = () => ({
  screen: 'debrief',
  missionId: MISSION_ID,
  targetId: TARGET.id,
  lastCargo: {},
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  player: {
    placed: ['launchpad', 'market', 'control-station', 'surface-silo'],
    placementPlots: { launchpad: 0, market: 1, 'surface-silo': 2, 'control-station': 3 },
    missionsDone: 6,
    francs: 1000,
    freeOperations: true,
    flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
    discoveredExoplanetTargets: { [TARGET.id]: TARGET },
    activeMission: { id: MISSION_ID, label: `${TARGET.name} survey flight` },
    missionPhase: 'debrief',
    stash: {},
    researchStamps: {},
  },
})

async function open(page: Page) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e2@example.test', verified: true }
  await page.route(/\/api\/(collections|realtime|health|community)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s, t, r, key]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(key as string, s as string)
  }, [JSON.stringify(save()), token(), JSON.stringify(record), KEY])
  await page.goto('/game')
}

const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), KEY)

test('a discovery survey flight stamps today and shows on the plate', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize(VIEWPORTS.phone)
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await open(page)
  await page.getByTestId('collect-reward-btn').click({ timeout: 30_000 })
  const today = new Date().toISOString().slice(0, 10)
  await expect.poll(async () => (await saved(page)).player?.researchStamps?.[today] ?? [], { timeout: 30_000 }).toContain('discovery-mission')

  // Walk to the Control Station the way a player does: back to the Base, then the building.
  await page.getByRole('button', { name: 'back' }).click()
  await page.getByTestId('building-control-station-hit').dispatchEvent('click', undefined, { timeout: 30_000 })
  const task = page.getByTestId('research-task-discovery-mission')
  await expect(task).toHaveAttribute('data-done', 'true', { timeout: 30_000 })
  await expect(task).toContainText('Fly a survey to a world you discovered')
  await page.getByTestId('help-close').click().catch(() => {})
  await page.screenshot({ path: test.info().outputPath('discovery-stamped-phone.png') })
  expect(errors).toEqual([])
})

test('a new player without a discovery sees no discovery task', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  await page.goto('/game/stage?preset=ui-research-calendar-empty')
  await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('research-task-classification')).toBeVisible()
  await expect(page.getByTestId('research-task-discovery-mission')).toHaveCount(0)
})
