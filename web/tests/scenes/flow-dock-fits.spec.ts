import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS, expectSound } from './helpers'

// Base dock: every button stays inside the screen at all three sizes (the phone portrait dock lost "Menu" off the right edge).
// Template borrowed from the survey card spec. SSL-626 / SSL-649: a PostHog survey card can appear over Base in a real session, and it is styled inline, so the scene checks
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
    missionsDone: 1,
    francs: 20_000_000,
    flightPlan: { completed: {}, hidden: false },
  },
}

async function open(page: Page, route: string) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
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
  await page.goto(route, { waitUntil: 'domcontentloaded' })
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`base dock fits inside the screen (${vp})`, async ({}, info) => {
    test.setTimeout(120_000)
    const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
    try {
      const context = await browser.newContext({ viewport: size, baseURL: 'http://localhost:4320' })
      const page = await context.newPage()
      await open(page, '/game/hub')
      expect(await page.evaluate(() => innerWidth), 'real viewport width').toBe(size.width)
      await expect(page.getByTestId('base-dock')).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(800)
      await page.screenshot({ path: info.outputPath(`dock-${vp}.png`) })
      const outside = await page.evaluate(() => {
        const dock = document.querySelector('[data-testid="base-dock"]')
        if (!dock) return ['no dock']
        const w = innerWidth, h = innerHeight
        return Array.from(dock.querySelectorAll<HTMLElement>('button')).flatMap(b => {
          const r = b.getBoundingClientRect()
          return r.left < -0.5 || r.right > w + 0.5 || r.bottom > h + 0.5 ? [`${b.textContent?.trim() || b.getAttribute('aria-label')} x${Math.round(r.left)}-${Math.round(r.right)} of ${w}`] : []
        })
      })
      expect(outside, 'dock buttons outside the screen').toEqual([])
      await expectSound(page)
    } finally { await browser.close() }
  })
}
