import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS, expectSound } from './helpers'

// SSL-655: with the sync chip showing (NOT SYNCED, OFFLINE) the OPS coach strip must not paint over any chip in the top row.
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
  for (const state of ['NOT SYNCED', 'OFFLINE'] as const) {
    for (const route of ['/game/hub', '/game/missions']) {
      test(`OPS strip clears every top chip with the sync chip at ${state} (${vp}, ${route})`, async ({}, info) => {
        test.setTimeout(120_000)
        const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
        try {
          const context = await browser.newContext({ viewport: size, baseURL: 'http://localhost:3001' })
          const page = await context.newPage()
          await open(page, route)
          expect(await page.evaluate(() => innerWidth), 'real viewport width').toBe(size.width)
          await expect(page.getByTestId('flight-plan-slot')).toBeVisible({ timeout: 30_000 })
          // A real network cut blanks the dev page (its chunks stop loading); the chip only listens to navigator.onLine and the offline event.
          if (state === 'OFFLINE') await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); window.dispatchEvent(new Event('offline')) })
          const chip = page.getByTestId('sync-chip')
          await expect(chip).toBeVisible({ timeout: 30_000 })
          await expect(chip).toHaveAttribute('aria-label', new RegExp(`^${state}`))
          const slot = page.getByTestId('flight-plan-slot')
          await expect(slot, 'the OPS strip is on screen').toBeVisible({ timeout: 15_000 })
          await page.waitForTimeout(800)
          await page.screenshot({ path: info.outputPath(`ops-strip-${state.replace(' ', '-')}-${vp}-${route.split('/').pop()}.png`) })
          const overlaps = await page.evaluate(() => {
            const strip = document.querySelector('[data-testid="flight-plan-slot"] > *')?.getBoundingClientRect()
            if (!strip) return ['no strip']
            const hit: string[] = []
            for (const el of document.querySelectorAll<HTMLElement>('.scene-chip, [data-testid$="-francs-chip"], [data-testid="stash-chip"]')) {
              const r = el.getBoundingClientRect()
              if (r.width === 0 || r.height === 0 || r.top > 120) continue
              if (r.left < strip.right && r.right > strip.left && r.top < strip.bottom && r.bottom > strip.top) hit.push(`${el.getAttribute('data-testid') ?? el.className} x${Math.round(r.left)}-${Math.round(r.right)} y${Math.round(r.top)}-${Math.round(r.bottom)} under strip x${Math.round(strip.left)}-${Math.round(strip.right)} y${Math.round(strip.top)}-${Math.round(strip.bottom)} slot ${JSON.stringify(document.querySelector('[data-testid=flight-plan-slot]')!.getBoundingClientRect().toJSON())} cs ${getComputedStyle(document.querySelector('[data-testid=flight-plan-slot]')!).left} inset ${document.documentElement.style.getPropertyValue('--top-chip-inset')}`)
            }
            return hit
          })
          expect(overlaps, 'chips under the OPS strip').toEqual([])
          await expectSound(page)
        } finally { await browser.close() }
      })
    }
  }
}
