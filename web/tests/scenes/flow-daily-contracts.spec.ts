import { expect, test, type Browser } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-570: the real /game route, signed-in Free Ops account. Two calendar days show different client contracts, and
// a player who has flown more missions sees a higher tier client.
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

async function openBoard(browser: Browser, size: { width: number; height: number }, day: string, missionsDone: number, shot?: string) {
  const context = await browser.newContext({ viewport: size })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(`${day}T10:00:00`))
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  const save = JSON.stringify({ screen: 'launchpad', player: { placed: ['launchpad'], missionsDone } })
  await page.addInitScript(([s, t, r, user]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(`landnam-game-state-v1:user:${user}`, s as string)
  }, [save, token(), JSON.stringify(record), USER])
  await page.goto('/game/launchpad')
  await expect(page.getByTestId('launchpad-focus-screen')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('rocket-builder-target').click()
  await expect(page.getByTestId('mission-board')).toBeVisible()
  await expect(page.getByTestId('mission-board')).toContainText(/\S/)
  const pool = await expect.poll(async () => page.evaluate(user => {
    const raw = localStorage.getItem(`landnam-game-state-v1:user:${user}`)
    return raw ? (JSON.parse(raw).player?.dailyClientPool ?? null) : null
  }, USER), { timeout: 15_000 }).not.toBeNull().then(() => page.evaluate(user => JSON.parse(localStorage.getItem(`landnam-game-state-v1:user:${user}`)!).player.dailyClientPool, USER))
  if (shot) await page.screenshot({ path: shot })
  await context.close()
  return pool as { date: string; missions: { id: string; client: string }[] }
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`daily contracts rotate and widen with progress, ${vp}`, async ({ browser }, info) => {
    test.setTimeout(120_000)
    const dayOne = await openBoard(browser, size, '2026-10-16', 3, info.outputPath(`daily-day1-${vp}.png`))
    const dayTwo = await openBoard(browser, size, '2026-10-17', 3, info.outputPath(`daily-day2-${vp}.png`))
    expect(dayOne.date).toBe('2026-10-16')
    expect(dayTwo.date).toBe('2026-10-17')
    expect(dayTwo.missions.map(m => m.id)).not.toEqual(dayOne.missions.map(m => m.id))
    const later = await openBoard(browser, size, '2026-10-16', 12, info.outputPath(`daily-late-${vp}.png`))
    expect(new Set(later.missions.map(m => m.client)).size).toBeGreaterThan(new Set(dayOne.missions.map(m => m.client)).size)
  })
}
