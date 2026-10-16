/**
 * Optional loader for the Go-compiled Takeon runtime (`takeon.wasm`, built by
 * takeon-go `go/scripts/build.sh wasm`). It installs `globalThis.takeon`, a small
 * JSON-string API that mirrors native TakeonKit. This is NOT a drop-in for the TS
 * engine used by `TakeOnMount`: see docs/takeon-go-wasm.md. Off unless
 * `NEXT_PUBLIC_TAKEON_GO_WASM=1`, so default web behaviour is unchanged.
 */

/** Shape of `globalThis.takeon` (cmd/wasm/main.go). Every payload is a JSON string. */
export interface TakeonGoGlobal {
  /** (seed, bodyId). Returns an error string, or null on success. */
  new: (seed: number, bodyId: string) => string | null
  step(dtSeconds: number): string
  order(kind: string, arg: number): boolean
  orderMine(x: number, y: number): boolean
  bank(): boolean
  state(): string
  mission(): string
  window(x: number, y: number, w: number, h: number): string
  snapshot(): string
  restore(json: string): string | null
}

export interface TakeonGoEvent { kind: string; x?: number; y?: number; detail?: string; amount?: number }
export interface TakeonGoWindow { x: number; y: number; w: number; h: number; size: number; heights: number[]; mats: number[]; ore: number[] }

/** Typed, parsed facade over the raw global. */
export interface TakeonGoRuntime {
  newGame(seed: number, bodyId: string): void
  step(dtSeconds: number): TakeonGoEvent[]
  order(kind: 'move' | 'drill' | 'cancel', arg?: number): boolean
  orderMine(x: number, y: number): boolean
  bank(): boolean
  state<T = unknown>(): T
  mission<T = unknown>(): T
  window(x: number, y: number, w: number, h: number): TakeonGoWindow
  snapshot(): string
  restore(json: string): void
}

export const TAKEON_GO_WASM_BASE = '/takeon-go'

export function isTakeonGoWasmEnabled(env?: Record<string, string | undefined>): boolean {
  // Keep the production read direct: Next replaces public environment accesses
  // in client bundles, but cannot do so when `process.env` is first passed as
  // an opaque object (which left the browser flag unset).
  return (env ? env.NEXT_PUBLIC_TAKEON_GO_WASM : process.env.NEXT_PUBLIC_TAKEON_GO_WASM) === '1'
}

/** The engine reduces seeds to 32 bits (TS `seed >>> 0`); do it here so JS numbers stay exact. */
export function clampTakeonSeed(seed: number): number {
  return seed >>> 0
}

export function wrapTakeonGo(g: TakeonGoGlobal): TakeonGoRuntime {
  const fail = (what: string, err: string | null) => { if (err) throw new Error(`takeon-go ${what}: ${err}`) }
  return {
    newGame: (seed, bodyId) => fail('new', g.new(clampTakeonSeed(seed), bodyId)),
    step: dt => JSON.parse(g.step(dt)) as TakeonGoEvent[],
    order: (kind, arg = 0) => g.order(kind, arg),
    orderMine: (x, y) => g.orderMine(x, y),
    bank: () => g.bank(),
    state: <T>() => JSON.parse(g.state()) as T,
    mission: <T>() => JSON.parse(g.mission()) as T,
    window: (x, y, w, h) => JSON.parse(g.window(x, y, w, h)) as TakeonGoWindow,
    snapshot: () => g.snapshot(),
    restore: json => fail('restore', g.restore(json)),
  }
}

interface GoClass { new (): { importObject: WebAssembly.Imports; run(instance: WebAssembly.Instance): Promise<void> } }

let loading: Promise<TakeonGoRuntime> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`takeon-go: could not load ${src}`))
    document.head.appendChild(el)
  })
}

/**
 * Fetch `wasm_exec.js` + `takeon.wasm` from `base` (default `/takeon-go`, populated by
 * `scripts/sync-takeon-go-wasm.sh`), start the Go program and resolve once
 * `globalThis.takeon` exists. Memoised: the Go program is a singleton.
 */
export function loadTakeonGo(base: string = TAKEON_GO_WASM_BASE): Promise<TakeonGoRuntime> {
  if (!loading) {
    loading = (async () => {
      const g = globalThis as typeof globalThis & { Go?: GoClass; takeon?: TakeonGoGlobal }
      if (!g.takeon) {
        if (!g.Go) await loadScript(`${base}/wasm_exec.js`)
        if (!g.Go) throw new Error('takeon-go: wasm_exec.js did not define Go')
        const go = new g.Go()
        const { instance } = await WebAssembly.instantiateStreaming(fetch(`${base}/takeon.wasm`), go.importObject)
        void go.run(instance) // never resolves: main() blocks on `select {}`
        for (let i = 0; i < 100 && !g.takeon; i++) await new Promise(r => setTimeout(r, 10))
      }
      if (!g.takeon) throw new Error('takeon-go: globalThis.takeon was not installed')
      return wrapTakeonGo(g.takeon)
    })().catch(err => { loading = null; throw err })
  }
  return loading
}
