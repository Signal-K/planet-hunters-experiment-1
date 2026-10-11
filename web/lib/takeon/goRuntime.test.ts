import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { clampTakeonSeed, isTakeonGoWasmEnabled, wrapTakeonGo, type TakeonGoGlobal } from './goRuntime'

describe('takeon-go flag and facade', () => {
  it('is off unless NEXT_PUBLIC_TAKEON_GO_WASM=1', () => {
    expect(isTakeonGoWasmEnabled({})).toBe(false)
    expect(isTakeonGoWasmEnabled({ NEXT_PUBLIC_TAKEON_GO_WASM: '0' })).toBe(false)
    expect(isTakeonGoWasmEnabled({ NEXT_PUBLIC_TAKEON_GO_WASM: '1' })).toBe(true)
  })

  it('reduces seeds to 32 bits like the engine', () => {
    expect(clampTakeonSeed(2 ** 32 + 5)).toBe(5)
    expect(clampTakeonSeed(-1)).toBe(0xffffffff)
  })

  it('parses JSON payloads and throws on error strings', () => {
    const raw: TakeonGoGlobal = {
      new: vi.fn((): string | null => 'unknown body'), step: () => '[{"kind":"moved","x":1,"y":2}]', order: () => true,
      orderMine: () => true, bank: () => false, state: () => '{"time":1}', mission: () => '{}',
      window: () => '{"x":0,"y":0,"w":1,"h":1,"size":96,"heights":[3],"mats":[1],"ore":[0]}', snapshot: () => '{}', restore: () => null,
    }
    const rt = wrapTakeonGo(raw)
    expect(() => rt.newGame(1, 'nope')).toThrow(/unknown body/)
    expect(rt.step(0.1)).toEqual([{ kind: 'moved', x: 1, y: 2 }])
    expect(rt.window(0, 0, 1, 1).heights).toEqual([3])
  })
})

// Runs the real takeon.wasm under Node when public/takeon-go has been synced
// (scripts/sync-takeon-go-wasm.sh); skipped otherwise.
const dir = path.resolve(__dirname, '../../public/takeon-go')
const haveWasm = existsSync(path.join(dir, 'takeon.wasm')) && existsSync(path.join(dir, 'wasm_exec.js'))

describe.skipIf(!haveWasm)('takeon.wasm under Node', () => {
  it('loads, steps, reads terrain and mines', async () => {
    await import(pathToFileURL(path.join(dir, 'wasm_exec.js')).href)
    const g = globalThis as unknown as { Go: new () => { importObject: WebAssembly.Imports; run(i: WebAssembly.Instance): Promise<void> }; takeon?: TakeonGoGlobal }
    const go = new g.Go()
    const { instance } = await WebAssembly.instantiate(readFileSync(path.join(dir, 'takeon.wasm')), go.importObject)
    void go.run(instance)
    for (let i = 0; i < 100 && !g.takeon; i++) await new Promise(r => setTimeout(r, 10))
    const rt = wrapTakeonGo(g.takeon as TakeonGoGlobal)

    rt.newGame(4212, 'moon')
    const st = rt.state<{ rover: { pos: { x: number; y: number } }; landing: { x: number; y: number } }>()
    const { x: rx, y: ry } = st.rover.pos
    const win = rt.window(rx - 6, ry - 6, 13, 13)
    expect(win.heights).toHaveLength(169)
    let target: [number, number] | null = null
    outer: for (let d = 2; d <= 5; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue
      if (win.heights[(ry + dy - win.y) * win.w + (rx + dx - win.x)] >= 1) { target = [rx + dx, ry + dy]; break outer }
    }
    expect(target).not.toBeNull()
    const [tx, ty] = target as [number, number]
    const before = rt.window(tx, ty, 1, 1).heights[0]
    expect(rt.orderMine(tx, ty)).toBe(true)
    const kinds = new Set<string>()
    for (let i = 0; i < 600; i++) rt.step(0.1).forEach(e => kinds.add(e.kind))
    expect(rt.window(tx, ty, 1, 1).heights[0]).toBeLessThan(before)
    expect(kinds.has('depositMined')).toBe(true)
    const progress = rt.mission<{ progress: { objectives: { target: number }[] } }>().progress
    expect(progress.objectives[0].target).toBe(3)
    expect(rt.bank()).toBe(true) // the rover is still within 2 tiles of the landing site
  })
})
