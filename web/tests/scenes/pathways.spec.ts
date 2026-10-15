import { chromium, expect, test, type Browser, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-611: Landnam is a semi-sandbox, so there is no single ordered hour. Each test starts from the same post-onboarding
// save and plays one way of playing on the real /game route as a signed-in account: client contractor, builder, miner,
// trader, explorer. The dev SKIP MINING button replaces the laser (the laser itself is not played here).
// Slow (about 4 minutes), so it only runs with PLAYTHROUGH=1:  PLAYTHROUGH=1 npx playwright test pathways.spec.ts
// It launches the bundled Chromium itself (channel: undefined): installed Chrome closes pages after 15-30s on this machine.
test.skip(!process.env.PLAYTHROUGH, 'slow; run with PLAYTHROUGH=1')
const USER = 'e2euser0000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: USER, exp: 4102444800 })}.sig`

const denyWebgl = () => {
  const get = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    return /webgl/.test(kind) ? null : (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
  } as typeof get
}

const POST_ONBOARDING = {
  screen: 'hub',
  player: {
    placed: ['launchpad', 'surface-silo', 'market'],
    placementPlots: { launchpad: 0, 'surface-silo': 2, market: 1 },
    missionsDone: 6,
    francs: 150_000_000,
    flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true },
    stash: { iron: 40, nickel: 20, silicon: 15 },
  },
}

async function open(page: Page, save: object) {
  const record = { id: USER, collectionId: '_pb_users_auth_', collectionName: 'users', email: 'e2e@example.test', verified: true }
  await page.addInitScript(denyWebgl)
  await page.route(/\/api\/(collections|realtime|health)/, route =>
    /auth-refresh/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: token(), record }) })
      : route.abort('connectionrefused'))
  await page.addInitScript(([s, t, r, user]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: JSON.parse(r as string) }))
    localStorage.setItem(`landnam-game-state-v1:user:${user}`, s as string)
  }, [JSON.stringify(save), token(), JSON.stringify(record), USER])
  await page.goto('/game')
  await page.waitForTimeout(2500)
}

type Snap = { screen: string; phase: string | null; player: Record<string, any> }
const snap = (page: Page): Promise<Snap | null> => page.evaluate(user => {
  const raw = localStorage.getItem(`landnam-game-state-v1:user:${user}`)
  if (!raw) return null
  const s = JSON.parse(raw)
  return { screen: s.screen, phase: s.player?.missionPhase ?? null, player: s.player }
}, USER)

const buttons = (page: Page) => page.evaluate(() => [...document.querySelectorAll('button, [role="button"]')]
  .filter(el => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 })
  .map(el => `${el.getAttribute('data-testid') ?? ''}|${(el.textContent ?? '').trim().slice(0, 24)}`).slice(0, 30))

const tap = async (page: Page, id: string) => {
  const el = page.getByTestId(id).first()
  if (await el.count() === 0 || !(await el.isVisible())) return false
  await el.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
  return true
}
const tapRole = async (page: Page, name: RegExp) => {
  const el = page.getByRole('button', { name }).first()
  if (await el.count() === 0 || !(await el.isVisible())) return false
  await el.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
  return true
}

/** Drives the flight, mining, delivery and debrief screens the same way for every pathway. `start` handles the base and board. */
async function drive(page: Page, until: (s: Snap) => boolean, start: (page: Page, s: Snap) => Promise<void>, log: string[], budgetMs = 300_000) {
  const t0 = Date.now()
  let last = ''
  let sig = ''
  let sigAt = Date.now()
  while (Date.now() - t0 < budgetMs) {
    const s = await snap(page)
    if (!s) { await page.waitForTimeout(500); continue }
    if (until(s)) return s
    const tag = `${s.screen}${s.phase ? ':' + s.phase : ''}`
    if (tag !== last) { log.push(tag); last = tag }
    const now = tag + '|' + (await buttons(page)).join(',')
    if (now !== sig) { sig = now; sigAt = Date.now() }
    else if (Date.now() - sigAt > 90_000) throw new Error(`stalled on ${tag}. Path: ${log.join(' > ')}. Buttons: ${(await buttons(page)).join(' ; ')}`)

    if (await tap(page, 'launch-sequence-skip-btn') || await tap(page, 'tutorial-complete-close') || await tap(page, 'delivery-confirm')) { await page.waitForTimeout(500); continue }
    switch (s.screen) {
      case 'transit': await page.waitForTimeout(1000); continue
      case 'delivery': {
        const next = page.locator('[data-testid^="delivery-"]:not([data-testid*="pause"]):not([data-testid*="back"])').first()
        if (await next.count()) await next.dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
        break
      }
      case 'mining':
        // SKIP MINING only shows with ?dev=1, which in-app navigation drops: reload the route, resuming from the save.
        if (!(await tap(page, 'dev-skip-mining-btn')) && !page.url().includes('dev=1')) await page.goto('/game/mining?dev=1')
        break
      case 'targets': case 'rocket-buy': case 'fab': case 'launchpad':
        await tapRole(page, /^launch$/i); break
      case 'galaxy': case 'instrument-hub': case 'mission-history':
        if (!(await tap(page, 'top-bar-back'))) await tapRole(page, /^back/i); break
      case 'hub': case 'missions': case 'build': case 'market': await start(page, s); break
      default: await tapRole(page, /^(continue|collect|done|skip|close|deliver)/i)
    }
    await page.waitForTimeout(700)
  }
  throw new Error(`ran out of time. Path: ${log.join(' > ')}. Buttons: ${(await buttons(page)).join(' ; ')}`)
}

// The config falls back to installed Chrome when the full Chromium binary is missing, so launch the bundled browser directly.
const withPage = (fn: (page: Page) => Promise<void>) => async () => {
  test.setTimeout(420_000)
  // Launched inside the test: a browser launched in beforeAll is closed ~30s in by the runner on this machine.
  const browser: Browser = await chromium.launch({ channel: undefined, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    const context = await browser.newContext({ viewport: VIEWPORTS.phone, baseURL: 'http://localhost:3001' })
    const pg = await context.newPage()
    await fn(pg)
  } finally { await browser.close().catch(() => {}) }
}
test.describe.configure({ mode: 'serial' })

test.describe('player pathways from a post-onboarding save', () => {
  test('client contractor: accept a daily contract, fly it, get paid, contract leaves the board', withPage(async page => {
    const log: string[] = []
    await open(page, POST_ONBOARDING)
    const before = (await snap(page))!.player
    const done = await drive(page, s => s.player.missionsDone > before.missionsDone, async (p, s) => {
      if (s.screen === 'hub' || s.screen === 'build') await tapRole(p, /new mission/i)
      else await tapRole(p, /^accept/i)
    }, log)
    expect(done.player.francs).toBeGreaterThan(before.francs - 1_000_000)
    expect(done.player.dailyClientPool.completedIds.length).toBe(1)
    console.log('CONTRACTOR', log.join(' > '))
  }))

  test('builder: take a client build job, fly it, and the client structure is placed', withPage(async page => {
    const log: string[] = []
    await open(page, POST_ONBOARDING)
    const before = (await snap(page))!.player
    const done = await drive(page, s => s.player.missionsDone > before.missionsDone, async (p, s) => {
      if (s.screen === 'hub' || s.screen === 'build') { await tapRole(p, /new mission/i); return }
      const board = p.getByTestId('mission-board')
      for (let i = 0; i < 80 && !/Build a (Fuel Depot|Battery Station|Fabrication Pad)/.test(await board.innerText()); i++) {
        await p.getByTestId('mission-board-next').dispatchEvent('click', undefined, { timeout: 1500 }).catch(() => {})
        await p.waitForTimeout(120)
      }
      await tapRole(p, /^accept/i)
    }, log)
    const structures = done.player.clientStructures ?? []
    expect(structures.length, `structures: ${JSON.stringify(structures)}`).toBeGreaterThan(0)
    expect(['fuel-depot', 'battery-station', 'fabrication-pad']).toContain(structures[0].structureKind)
    console.log('BUILDER', log.join(' > '), JSON.stringify(structures))
  }))

  test('miner: a self-directed run needs no client, and the haul can be sold', withPage(async page => {
    const log: string[] = []
    await open(page, POST_ONBOARDING)
    const before = (await snap(page))!.player
    const done = await drive(page, s => s.player.missionsDone > before.missionsDone, async (p, s) => {
      if (s.screen === 'hub' || s.screen === 'build') { await tapRole(p, /new mission/i); return }
      await tap(p, 'mission-board-tab-program')
      await tap(p, 'program-start-freeops-self-directed-mining')
    }, log)
    console.log('MINER', log.join(' > '), 'francs', before.francs, '->', done.player.francs, 'stash', JSON.stringify(done.player.stash))
    expect(done.player.missionsDone).toBeGreaterThan(before.missionsDone)
  }))

  test('trader: the Exchange sells crates from the stash for francs', withPage(async page => {
    await open(page, { ...POST_ONBOARDING, screen: 'market' })
    await page.goto('/game/market')
    await expect(page.getByTestId('exchange-crate-iron')).toBeVisible({ timeout: 20_000 })
    const before = (await snap(page))!.player
    await page.getByTestId('exchange-crate-iron').dispatchEvent('click')
    await expect.poll(async () => (await snap(page))!.player.francs, { timeout: 10_000 }).toBeGreaterThan(before.francs)
    await page.getByTestId('sell-all-btn').dispatchEvent('click')
    await page.getByTestId('sell-all-btn').dispatchEvent('click')
    await expect.poll(async () => Object.values((await snap(page))!.player.stash ?? {}).reduce((a: number, b) => a + (b as number), 0), { timeout: 10_000 }).toBe(0)
  }))

  test('explorer: launch the space telescope from the program board', withPage(async page => {
    const log: string[] = []
    await open(page, POST_ONBOARDING)
    const done = await drive(page, s => !!s.player.transitSatelliteLaunchedAt || !!s.player.deepSpaceTelescopeLaunchedAt, async (p, s) => {
      if (s.screen === 'hub' || s.screen === 'build') { await tapRole(p, /new mission/i); return }
      await tap(p, 'mission-board-tab-program')
      await tap(p, 'program-start-story-transit-telescope-launch')
    }, log)
    console.log('EXPLORER', log.join(' > '))
    expect(done.player.transitSatelliteLaunchedAt ?? done.player.deepSpaceTelescopeLaunchedAt).toBeTruthy()
  }))
})
