import { chromium, expect, test, type Page } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// SSL-365: real browser offline. Signs in for real against the LOCAL stack, drops the network, builds something, reconnects,
// and checks PocketBase holds the build exactly once. Opt-in (needs local PocketBase :8090/:8091 and a dev server), so it
// never runs with the normal scene suite:  OFFLINE_E2E=1 npx playwright test flow-offline-replay.spec.ts
test.skip(!process.env.OFFLINE_E2E, 'opt-in; run with OFFLINE_E2E=1 against the local stack')

const SHARED = process.env.OFFLINE_SHARED_PB ?? 'http://127.0.0.1:8090'
const LANDNAM = process.env.OFFLINE_LANDNAM_PB ?? 'http://127.0.0.1:8091'
const EMAIL = process.env.OFFLINE_EMAIL ?? 'ssl365.offline@example.com'
const PASSWORD = process.env.OFFLINE_PASSWORD ?? 'OfflineTest365!'

const json = async (res: Response) => { if (!res.ok) throw new Error(`${res.url} -> ${res.status}`); return res.json() }

async function signIn() {
  const shared = await json(await fetch(`${SHARED}/api/collections/users/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: EMAIL, password: PASSWORD }) }))
  const landnam = await json(await fetch(`${LANDNAM}/api/landnam-auth/exchange`, { method: 'POST', headers: { Authorization: `Bearer ${shared.token}` } }))
  return { shared, landnam }
}

/** Local only: clears the account's saved game so every viewport starts from the same server state. */
async function resetRemoteSave(userId: string) {
  for (const url of [SHARED, LANDNAM]) if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error(`refusing to run against ${url}`)
  const su = await json(await fetch(`${LANDNAM}/api/collections/_superusers/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'liam@skinetics.tech', password: 'ThisIsATestPassword' }) }))
  const list = await json(await fetch(`${LANDNAM}/api/collections/game_states/records?filter=${encodeURIComponent(`user = "${userId}"`)}`, { headers: { Authorization: su.token } }))
  for (const item of list.items) await fetch(`${LANDNAM}/api/collections/game_states/records/${item.id}`, { method: 'DELETE', headers: { Authorization: su.token } })
}

const remoteState = async (token: string, userId: string) => {
  const res = await json(await fetch(`${LANDNAM}/api/collections/game_states/records?filter=${encodeURIComponent(`user = "${userId}"`)}`, { headers: { Authorization: token } }))
  return res.items as Array<{ id: string; state: { player?: { placed?: string[] } } }>
}

const placed = (page: Page, uid: string) => page.evaluate(u => JSON.parse(localStorage.getItem(`landnam-game-state-v1:user:${u}`) ?? 'null')?.player?.placed as string[] | undefined, uid)

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`a build made offline reaches PocketBase once after reconnect (${vp})`, async ({}, info) => {
    test.setTimeout(120_000)
    const { landnam } = await signIn()
    const uid = landnam.record.id as string
    await resetRemoteSave(uid)
    const before = await remoteState(landnam.token, uid)
    const browser = await chromium.launch({ args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
    try {
      const context = await browser.newContext({ viewport: size, baseURL: process.env.SCENES_BASE_URL ?? 'http://localhost:3001', hasTouch: vp !== 'desktop' })
      const page = await context.newPage()
      await page.addInitScript(([u]) => {
        if (localStorage.getItem('seeded-offline')) return
        localStorage.setItem('seeded-offline', '1')
        localStorage.setItem(`landnam-game-state-v1:user:${u}`, JSON.stringify({ screen: 'hub', player: { placed: ['launchpad'], missionsDone: 1, francs: 20_000_000 } }))
      }, [uid])
      page.setDefaultTimeout(20_000)
      await page.goto('/game/hub')
      // Real sign-in through the auth form (no injected session).
      await page.getByPlaceholder('Email').fill(EMAIL)
      await page.getByPlaceholder('Password').fill(PASSWORD)
      await page.getByRole('button', { name: /return to base/i }).click()
      await expect(page.getByTestId('building-launchpad')).toBeVisible({ timeout: 40_000 })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      // The shell is cached by the production service worker on the first online visit; wait for it before going offline.
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
      await page.waitForTimeout(3000)
      await page.screenshot({ path: info.outputPath(`offline-1-online-${vp}.png`) })

      await context.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
      await expect(page.getByTestId('sync-chip')).toHaveAttribute('data-offline', 'true', { timeout: 10_000 })
      const countBefore = (await placed(page, uid))?.length ?? 0

      // Build one more structure the way a player does, with the network off.
      await page.getByTestId('hub-build-btn').dispatchEvent('click')
      await page.waitForTimeout(1500)
      await page.locator('[data-testid^="build-option-"]').first().dispatchEvent('click')
      await page.waitForTimeout(800)
      await page.locator('[data-testid^="build-plot-"], [data-testid^="build-site-"], [data-testid="build-place-underground"]').first().dispatchEvent('click')
      await expect.poll(async () => (await placed(page, uid))?.length ?? 0, { timeout: 20_000 }).toBeGreaterThan(countBefore)
      await page.screenshot({ path: info.outputPath(`offline-2-built-offline-${vp}.png`) })

      // The server must not have it yet, and a reload while offline must keep the build (device-local save).
      expect((await remoteState(landnam.token, uid))[0]?.state?.player?.placed ?? []).not.toContain((await placed(page, uid))!.at(-1))

      await context.setOffline(false)
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      const want = (await placed(page, uid))!
      await expect.poll(async () => (await remoteState(landnam.token, uid))[0]?.state?.player?.placed ?? [], { timeout: 45_000 }).toEqual(want)
      const after = await remoteState(landnam.token, uid)
      expect(after, 'exactly one save record per account').toHaveLength(1)
      if (before.length) expect(after[0].id).toBe(before[0].id)
      await page.screenshot({ path: info.outputPath(`offline-3-synced-${vp}.png`) })
    } finally {
      await browser.close()
    }
  })
}
