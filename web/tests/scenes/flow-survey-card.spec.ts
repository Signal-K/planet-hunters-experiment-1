import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-626 / SSL-649: a PostHog survey card can appear over Base in a real session, and it is styled inline, so the scene checks
// never reached it. The staging playthrough found the six-answer question clipped by 26px and the card opening under a Base
// callout. Bundled Chromium is launched directly (installed Chrome dies after ~30s here); the survey runtime is switched on the
// way Cypress used to (`Cypress.env('allowSurveys')`), because dev builds keep it off.
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const seed = {
  screen: 'hub',
  player: {
    placed: ['launchpad', 'surface-silo', 'market'],
    missionsDone: 6,
    francs: 20_000_000,
    flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
    freeOperations: true,
  },
}

async function open(page: Page) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return /webgl/.test(kind) ? null : (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof get
    ;(window as unknown as { Cypress: { env: () => boolean } }).Cypress = { env: () => true }
  })
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s, t, r, user]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(`landnam-game-state-v1:user:${user}`, s as string)
  }, [JSON.stringify(seed), token(), JSON.stringify(record), USER])
  await page.goto('/game')
  await expect(page.locator('[data-screen="hub"]')).toBeVisible({ timeout: 30_000 })
}

const trigger = (page: Page, key: string) =>
  page.evaluate(k => (window as unknown as { __landnamTriggerSurvey: (key: string) => void }).__landnamTriggerSurvey(k), key)

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`six-answer survey card is whole and reachable at ${size.width}x${size.height}`, async ({}, info) => {
    test.setTimeout(120_000)
    const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
    try {
      const page = await (await browser.newContext({ viewport: size, baseURL: 'http://localhost:3001' })).newPage()
      await open(page)
      expect(await page.evaluate(() => innerWidth), 'real viewport width').toBe(size.width)
      await page.waitForTimeout(2500)
      await expect.poll(() => page.evaluate(() => !!(window as unknown as { __landnamTriggerSurvey?: unknown }).__landnamTriggerSurvey), { timeout: 15_000 }).toBe(true)
      await page.screenshot({ path: info.outputPath(`base-before-survey-${vp}.png`) })
      await trigger(page, 'lnm_mission_friction')
      const card = page.getByTestId('survey-sheet')
      await expect(card).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('survey-choice')).toHaveCount(6)
      await page.waitForTimeout(600)
      await page.screenshot({ path: info.outputPath(`survey-card-${vp}.png`) })

      const problems = await card.evaluate(el => {
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
        const box = el.getBoundingClientRect()
        if (box.left < -0.5 || box.right > innerWidth + 0.5 || box.top < -0.5 || box.bottom > innerHeight + 0.5) bad.push('the card runs off the screen')
        return bad
      })
      expect(problems, 'the card meets the floors and fits').toEqual([])

      // Skip is reachable: nothing else is painted over its centre.
      const skipCovered = await card.getByRole('button', { name: 'SKIP' }).evaluate(el => {
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return !top || !el.contains(top)
      })
      expect(skipCovered, 'Skip is not covered').toBe(false)
    } finally { await browser.close().catch(() => {}) }
  })
}
