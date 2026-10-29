# Game scene and component map

This is the bridge from the current Landnám application to a future scene-authored engine. It inventories what exists without pretending the current React, Pixi, SwiftUI and SceneKit implementations are already one engine.

## The two files

- `shared/engine/game-map.generated.json` is the exhaustive inventory. It lists every routed web screen, native screen enum case, QA scene, authored scene JSON, production game component file, native screen/scene component file and shared scene/layout file. Generate it with `node scripts/generate-game-map.mjs`; verify drift with `node scripts/generate-game-map.mjs --check`.
- `shared/engine/scene-types.json` is the approved type and slot contract. It groups every web route into six scene types and defines normalized, safe-area-relative slots.
- `shared/authoring/` is the editable source layer: plain-language briefs and TOML scene/mission files live beside one another and are reviewable in any code editor.

The generated file records gaps instead of hiding them. `routesWithoutSceneType` and `unknownSlots` are hard failures in check mode. A player-facing QA entry needs both a web fixture and an iOS fixture so it can be run independently.

## Current scene systems

| Layer | Current authority | Role | Engine destination |
| --- | --- | --- | --- |
| Navigation | `web/lib/game-screens.ts`, `native/LandnamCore/.../Screen.swift` | Player-visible states | Scene IDs and transitions |
| Runtime routing | `GameScreenRouter.tsx`, `RootView.swift` | Chooses the platform view | Platform scene adapter |
| QA fixtures | `qa/scenes.json`, `devPresets.ts`, `SceneCatalog.swift` | Isolated web and iOS states | `node scripts/scene.mjs <id> --check` |
| Authored scenes | `web/public/game/scenes/*.scene.json` | Small Pixi entity trees | Shared scene files |
| World simulation | `shared/scenes/*.json`, web/native world sims | Deterministic background entities | Shared systems and prefabs |
| UI placement | `base-hud-zones.json` plus per-view layout | Safe areas and controls | Scene-type slots |
| Behavior | React hooks/systems and Swift models/views | Input, rules and persistence | Bound code components |

## Scene families

The config maps the whole routed game into six families: `base`, `travel`, `field`, `build`, `exchange-lab`, and `menu`. These are layout and interaction contracts, not visual themes. A scene instance chooses a type, declares objects, assigns each object to a slot, and binds behavior; web and native adapters render the same declaration.

The first migration is the SSL-615 pilot: Earth Base at named progression stages, followed by one contract, one base-construction mission, one own-probe mission and one free-mining operation. The isolated stage must load the same TOML as the real runtime and expose the object tree, slots, anchors, assets, state fixture and validation errors. Do not infer parity from the generated inventory; it proves coverage of source files, not equivalent behavior or appearance.

## Minimal future scene shape

```toml
format = 1
id = "mining-run"
type = "field"

[[objects]]
id = "world"
kind = "scene"
prefab = "mining-world"
slot = "world"

[[objects]]
id = "laser"
kind = "instrument"
slot = "primaryAction"
components = ["MiningController"]

[[objects]]
id = "hud"
kind = "ui"
prefab = "shared-hud"
slot = "hud"
```

This is deliberately smaller than the Buffer/Fathom proposal while keeping its useful authoring model: hand-authored structure, nested prefabs, standalone scenes, deterministic fixtures and cross-platform adapters. TOML is the human source format; platform code remains responsible for behavior and rendering.

## Boundaries

- “Every component” means every production file inside the game component roots, not CSS modules, tests, backend hooks, generic site UI or generated theme code.
- Every visible or interactive element is represented by an object, including controls whose renderer is DOM or SwiftUI. Platform views are adapters, not a second source of scene structure.
- Slot rectangles are normalized to the safe area so the same config can be interpreted at phone portrait, phone landscape and desktop sizes.
- Shared HUD and route names remain governed by the canonical repo instructions; the map must not introduce scene titles or platform-specific forks.
