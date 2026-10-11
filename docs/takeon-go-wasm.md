# Takeon Go WASM vs TakeOnMount (compatibility note)

Status: experiment, off by default. Branch `orbit/takeon-scene`. Verified 11 Oct 2026 under Node
(`web/lib/takeon/goRuntime.test.ts`) and in headless Chrome against a production Next build
(`web/tests/scenes/takeon-go-wasm.production.spec.ts`).

## What the WASM is

`takeon-go` `go/scripts/build.sh wasm` produces `dist/takeon.wasm` (3.7 MB, ~1.0 MB gzip) and Go's `wasm_exec.js`.
Running it installs one global, `globalThis.takeon` (`go/cmd/wasm/main.go`), over the same `mobile.Engine` facade
that backs iOS (`Takeon.xcframework`) and Android (`takeon.aar`):

| call | returns |
| --- | --- |
| `new(seed, bodyId)` | `null` or an error string (creates/replaces the single game) |
| `step(dt)` | JSON array of events (`moved`, `depositMined`, `mineOrder`, `banked`, `missionComplete`, ...) |
| `order(kind, arg)` | bool; `move` (0..3), `drill`, `cancel` |
| `orderMine(x, y)` / `bank()` | bool |
| `state()` / `mission()` | JSON strings (rover, weather, stats, landing; mission progress) |
| `window(x, y, w, h)` | JSON terrain rectangle: top height, top material, ore-beneath depth per column |
| `snapshot()` / `restore(json)` | Go save blob (v1) / error string or `null` |

It is headless: no renderer, no input, no timer. The host calls `step(dt)` itself (it keeps fractional ticks).

## Why it cannot replace the engine behind `TakeOnMount` today

`TakeOnMount` mounts the vendored TS stack (`@takeon/engine` `RoverGame` + `@takeon/pixi` renderer and controls).

1. **Rendering and input.** Pixi draws from the TS sim and owns pointer controls (tap-to-drive, views). The Go side only
   exposes data; a renderer would have to consume `window()`/`state()`.
2. **Surface area.** `TakeOnMountHandle` needs `build`, `demolish`, `deposit`, `facedStructure`, `structures`, photos, anomaly
   documenting, `setView`. Go has none of these (`build/scan/photo/craft/launch/deposit` return `ErrUnsupported`). Only
   `move`, `mine` (via `orderMine`), `bank`, mission progress and weather exist.
3. **Bodies.** Go ships the 11 generated bodies only. `buildLandnamBody` (Landnam biomes gated by habitability and life stage,
   structure glyph registration, custom body kinds) has no Go equivalent, so Landnam targets would get different terrain.
4. **Saves.** `LandnamSync` stores TS `MissionState`; Go `snapshot()` is its own schema. They are not interchangeable.
5. **Events.** `bindTakeonHostEvents` maps TS events (`stateChanged`, `blocked` reasons, `anomalyDocumented`, `photo`);
   Go events are a different vocabulary (see `GoTakeonEngine.map` in native TakeonKit).
6. **Singleton.** One Go program per page, one game at a time; the TS engine allows several `RoverGame`s.
7. **Parity.** Go reproduces the TS RNG, noise, terrain and rover sim for the 11 bodies (`parity_test.go` against golden
   vectors), so terrain and drive results should match for those bodies; mining, mission hooks and the autopilot are Go-runtime
   additions with no TS twin.

## What is in this branch (low risk, flag-gated)

- `web/lib/takeon/goRuntime.ts`: typed facade (`wrapTakeonGo`) and `loadTakeonGo()` (loads `/takeon-go/wasm_exec.js` and
  `takeon.wasm`, memoised). `isTakeonGoWasmEnabled()` reads `NEXT_PUBLIC_TAKEON_GO_WASM === '1'`.
- `TakeOnMount`: when the flag is on it loads the runtime in the background and exposes it as `handle.goRuntime()`.
  Flag off (default): the effect returns immediately, `goRuntime()` is `null`, behaviour is unchanged. The TS engine still
  drives the field either way.
- `web/scripts/sync-takeon-go-wasm.sh`: builds the WASM and copies it to `public/takeon-go/` (gitignored). Nothing is fetched
  at start time, so the "Docker starts offline" rule holds.
- `web/lib/takeon/goRuntime.test.ts`: facade tests plus a real-WASM test (new game, terrain window, mine order, bank). The
  real-WASM test skips when the artifacts are not synced.
- `web/tests/scenes/takeon-go-wasm.production.spec.ts`: production-browser proof that a mounted `TakeOnMount` loads the
  flagged runtime, then runs `new`, `step`, `orderMine`, `bank`, and mission progress through the browser facade. It also
  proves an unflagged production build makes no WASM request or global.

## Suggested next steps

Decide the target first: (a) a Go-driven web field using the same iso renderer as native (consume `window()`; needs a Pixi or
Canvas renderer and its own save path), or (b) keep TS for web and use Go only for native/Android. For (a), start with a read-only
parity view next to the TS field to compare terrain and rover state tile for tile before wiring input.
