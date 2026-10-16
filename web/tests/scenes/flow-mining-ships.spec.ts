import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: laser mining is played for real (no dev skip) with every purchasable ship (Explorer hand drill, Prospector laser T2,
// Surveyor plasma T3), on phone, landscape and desktop, firing with the on-screen Fire button (touch) and with Space (keyboard).
// Slow, so it only runs with PLAYTHROUGH=1. Bundled Chromium is launched directly (installed Chrome dies after ~30s here).
test.skip(!process.env.PLAYTHROUGH, 'slow; run with PLAYTHROUGH=1')
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const SHIPS = {
  explorer: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  prospector: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
  surveyor: { chassis: 'hull-mk3', propulsion: 'ion-a3', drill: 'plasma-t3' },
} as const

const seed = (rocket: object) => ({
  screen: 'mining',
  missionId: 'self-directed-freeops-aluminium-stock',
  targetId: 'ryugu',
  rocket,
  player: {
    placed: ['launchpad', 'surface-silo', 'market'],
    missionsDone: 6,
    francs: 20_000_000,
    flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
    activeMission: { id: 'self-directed-freeops-aluminium-stock', label: 'Aluminium stock run → Ryugu' },
    missionPhase: 'mining',
    stash: {},
  },
})

async function open(page: Page, rocket: object) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return /webgl/.test(kind) ? null : (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof get
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
  }, [JSON.stringify(seed(rocket)), token(), JSON.stringify(record), USER])
  await page.goto('/game/mining')
}

const cargo = async (page: Page) => {
  const label = await page.getByTestId('mining-cargo-chip').getAttribute('aria-label').catch(() => null)
  return Number(/(\d+)/.exec(label ?? '')?.[1] ?? 0)
}

for (const [ship, rocket] of Object.entries(SHIPS)) {
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    for (const input of vp === 'desktop' ? ['keyboard'] : ['touch']) {
      test(`${ship} mines ore with the laser on ${vp} (${input})`, async () => {
        test.setTimeout(150_000)
        const browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
        try {
          const ctx = await browser.newContext({ viewport: size, baseURL: 'http://localhost:3001', hasTouch: input === 'touch' })
          const page = await ctx.newPage()
          await open(page, rocket)
          await expect(page.getByTestId('mining-cargo-chip')).toBeAttached({ timeout: 40_000 })
          for (const id of ['mining-gate-sell', 'dismiss-freeops-mining-explainer']) {
            const el = page.getByTestId(id)
            if (await el.count() && await el.first().isVisible()) await el.first().dispatchEvent('click')
          }
          // A Free Ops run must not open the full-screen controls guide over the scene: it hides Fire.
          await expect(page.locator('.mining-guide-dock')).toHaveCount(0)
          await page.waitForTimeout(500)
          const shot = (name: string) => process.env.SHOT_DIR ? page.screenshot({ path: `${process.env.SHOT_DIR}/mine-${ship}-${vp}-${name}.png` }) : Promise.resolve()
          await shot('start')
          const fire = page.locator('[data-beacon="mining-fire-laser"], [data-testid="mining-fire-laser"]').first()
          await expect(fire, 'the Fire button must be visible to a player').toBeVisible({ timeout: 10_000 })
          const t0 = Date.now()
          let got = 0
          while (Date.now() - t0 < 100_000 && got < 2) {
            if (input === 'keyboard') { await page.keyboard.press('f') }
            else if (await fire.count()) await fire.dispatchEvent('click', undefined, { timeout: 1000 }).catch(() => {})
            await page.waitForTimeout(450)
            got = await cargo(page)
          }
          await page.waitForTimeout(3000); await shot('end')
          console.log(`MINE ${ship} ${vp} ${input}: cargo ${got} after ${Math.round((Date.now() - t0) / 1000)}s`)
          expect(got, `${ship} on ${vp} mined nothing`).toBeGreaterThan(0)
        } finally { await browser.close().catch(() => {}) }
      })
    }
  }
}
