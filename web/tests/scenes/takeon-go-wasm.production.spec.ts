import { expect, test } from '@playwright/test'
import { stage } from './helpers'

/**
 * Browser proof for the optional Go runtime. Run this only against a production
 * Next build that has both NEXT_PUBLIC_TAKEON_GO_WASM=1 and staging fixtures
 * enabled; normal scene runs intentionally keep the experiment off.
 */
test.describe('TakeOn Go WASM production loader', () => {
  test('loads beside TakeOnMount and runs the mining facade', async ({ page }, testInfo) => {
    test.skip(process.env.TAKEON_GO_WASM_BROWSER !== '1', 'requires the explicit Go-WASM production build')
    const wasmResponses: { contentType: string | undefined; status: number }[] = []
    page.on('response', response => {
      if (response.url().endsWith('/takeon-go/takeon.wasm')) {
        wasmResponses.push({ contentType: response.headers()['content-type'], status: response.status() })
      }
    })
    const { errors } = await stage(page, 'ui-rover-mining')
    await expect.poll(() => wasmResponses).toEqual([{ contentType: expect.stringContaining('application/wasm'), status: 200 }])
    await expect(page.locator('[data-testid="rover-mining-screen"]')).toBeVisible()
    await page.waitForFunction(() => typeof (window as typeof window & { takeon?: unknown }).takeon === 'object')

    const result = await page.evaluate(() => {
      type RawTakeon = {
        new: (seed: number, bodyId: string) => string | null
        step: (dt: number) => string
        orderMine: (x: number, y: number) => boolean
        bank: () => boolean
        state: () => string
        mission: () => string
        window: (x: number, y: number, width: number, height: number) => string
      }
      const runtime = (window as typeof window & { takeon: RawTakeon }).takeon
      const created = runtime.new(4212, 'moon')
      if (created) throw new Error(created)
      const initial = JSON.parse(runtime.state()) as { rover: { pos: { x: number; y: number } } }
      const { x: rx, y: ry } = initial.rover.pos
      const terrain = JSON.parse(runtime.window(rx - 6, ry - 6, 13, 13)) as { x: number; y: number; w: number; heights: number[] }
      let target: { x: number; y: number } | null = null
      for (let distance = 2; distance <= 5 && !target; distance++) {
        for (let dy = -distance; dy <= distance && !target; dy++) {
          for (let dx = -distance; dx <= distance; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== distance) continue
            if (terrain.heights[(ry + dy - terrain.y) * terrain.w + (rx + dx - terrain.x)] >= 1) {
              target = { x: rx + dx, y: ry + dy }
              break
            }
          }
        }
      }
      if (!target) throw new Error('No mineable column found near the landing site')
      const accepted = runtime.orderMine(target.x, target.y)
      const events = new Set<string>()
      for (let i = 0; i < 600; i++) {
        for (const event of JSON.parse(runtime.step(0.1)) as { kind: string }[]) events.add(event.kind)
      }
      const banked = runtime.bank()
      const mission = JSON.parse(runtime.mission()) as { progress: { objectives: { target: number }[] } }
      return { accepted, banked, events: [...events], objectiveTarget: mission.progress.objectives[0]?.target }
    })

    expect(result.accepted).toBe(true)
    expect(result.events).toContain('depositMined')
    expect(result.banked).toBe(true)
    expect(result.objectiveTarget).toBe(3)
    expect(errors).toEqual([])
    for (const [name, viewport] of Object.entries({
      phone: { width: 390, height: 844 },
      landscape: { width: 926, height: 428 },
      desktop: { width: 1440, height: 900 },
    })) {
      await page.setViewportSize(viewport)
      await expect.poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual(viewport)
      await page.screenshot({ path: testInfo.outputPath(`takeon-go-wasm-${name}.png`), fullPage: true })
    }
  })

  test('does not request the runtime when the build flag is absent', async ({ page }) => {
    test.skip(process.env.TAKEON_GO_WASM_BROWSER !== '0', 'requires the explicit unflagged production build')
    const wasmResponses: number[] = []
    page.on('response', response => {
      if (response.url().endsWith('/takeon-go/takeon.wasm')) wasmResponses.push(response.status())
    })
    const { errors } = await stage(page, 'ui-rover-mining')
    await page.waitForTimeout(400)
    expect(wasmResponses).toEqual([])
    expect(await page.evaluate(() => typeof (window as typeof window & { takeon?: unknown }).takeon)).toBe('undefined')
    expect(errors).toEqual([])
  })
})
