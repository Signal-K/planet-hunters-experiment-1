import { expect, test, type Browser, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-570: the real /game route, signed-in Free Ops account. Two calendar days show different client contracts, and
// a player who has flown more missions sees a higher tier client.
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

async function openBoard(browser: Browser, size: { width: number; height: number }, day: string, missionsDone: number, shot?: string, afterOpen?: (page: Page) => Promise<void>) {
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
  try {
  const pool = await expect.poll(async () => page.evaluate(user => {
    const raw = localStorage.getItem(`landnam-game-state-v1:user:${user}`)
    return raw ? (JSON.parse(raw).player?.dailyClientPool ?? null) : null
  }, USER), { timeout: 15_000 }).not.toBeNull().then(() => page.evaluate(user => JSON.parse(localStorage.getItem(`landnam-game-state-v1:user:${user}`)!).player.dailyClientPool, USER))
  if (afterOpen) await afterOpen(page)
  else if (shot) await page.screenshot({ path: shot })
  return pool as { date: string; missions: { id: string; client: string }[] }
  } finally { await context.close() }
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

// SSL-571: a client build job reaches the board and can be accepted, like any other contract.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`a construct contract can be found and accepted, ${vp}`, async ({ browser }, info) => {
    test.setTimeout(120_000)
    await openBoard(browser, size, '2026-10-16', 6, undefined, async page => {
      const board = page.getByTestId('mission-board')
      const offers = page.getByRole('button', { name: /^Select / })
      for (let i = 0; i < 60 && !(await board.innerText()).match(/Build a (Fuel Depot|Battery Station|Fabrication Pad)/); i++) {
        const count = await offers.count()
        let selected = 0
        for (let n = 0; n < count; n++) {
          if ((await offers.nth(n).getAttribute('data-selected')) != null) selected = n
        }
        await offers.nth((selected + 1) % Math.max(count, 1)).click()
        await page.waitForTimeout(120)
      }
      await expect(board).toContainText(/Build a (Fuel Depot|Battery Station|Fabrication Pad)/)
      await page.screenshot({ path: info.outputPath(`construct-card-${vp}.png`) })
      await board.getByRole('button', { name: /accept/i }).first().click()
      await expect(page.getByTestId('mission-board')).toHaveCount(0, { timeout: 15_000 })
      await expect(page.getByTestId('rocket-builder')).toBeVisible({ timeout: 15_000 })
      await page.waitForTimeout(600)
      await page.screenshot({ path: info.outputPath(`construct-accepted-${vp}.png`) })
    })
  })
}
