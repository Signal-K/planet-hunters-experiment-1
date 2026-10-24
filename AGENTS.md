# Landnam agent guide

Landnam ships only a Next.js web build and an iOS SwiftUI build. `AGENTS.md` is
canonical; area files point here. Keep work small, scene-first, and fast.

## Fast loop

1. Confirm `cycle/4`, inspect `git status --short`, and read the active Linear
   `SSL-*` issue plus its latest comment.
2. Find the authored scene or mission in `shared/authoring/`, then its web and
   iOS implementation from the map below.
3. Implement web, then the matching iOS behavior before starting another slice.
4. Run the smallest relevant type/build or colocated test. Do not run broad
   suites by default.
5. Open the affected scene in the VS Code/Cursor Simple Browser and inspect it.
   `node scripts/scene.mjs <scene> --check` navigates the open follower tab,
   waits for the scene to mount, and reports its real viewport. No Playwright,
   Cypress, Chromium, Chrome, or second test stack exists in this repository.

Open `http://localhost:4320/game/hub?follow=1` once using **Simple Browser:
Show**. `make ensure` starts the local stack if needed. The dev bridge follows
`scripts/preview-target.mjs`, so agents can route and exercise the tab through
`scripts/dev-check.mjs` without controlling the desktop.

## Rules

- Work directly on `cycle/4`; never push to `main`. One coherent ticket outcome
  is one commit. Use Linear for the task record and handoff.
- Web and iOS are the only supported targets. Do not add macOS, iPadOS,
  Android, desktop, Electron, Godot, Playwright, Cypress, or browser runners.
- Every gameplay surface is an in-world scene, not a card grid. Every scene and
  mission must have an authored fixture and a deep link. Register it in
  `qa/scenes.json` and `scripts/preview-target.mjs` so it can be launched alone.
- Scene and mission data lives in `shared/authoring/`; run
  `node scripts/authoring.mjs check` after changing it. Never hand-edit its
  generated runtime outputs.
- Use shared tokens only. Text is at least 14px and taps are at least 44px.
  Keep the shared HUD, offline outbox, sign-in requirement, and real-scene
  interaction model intact.
- Do not use a user’s device or desktop. The editor Simple Browser and iOS
  Simulator are the supported interactive surfaces.
- Keep discovery bounded: `rg -n`, then read a small window. Do not open
  `web/package-lock.json`, generated theme files, assets, or build output.

## Verification

Web: `cd web && npm run typecheck`, then a focused `npm run test:file -- <path>`
when logic changed, and a checked Simple Browser scene. iOS: build the simulator
target and launch the matching `SceneCatalog` id when native code changed. State
exactly what ran and what was skipped; source checks never substitute for a
rendered scene.

## Commit

After a verified ticket outcome: inspect `git status --short`, stage the task
from the repository root with `git add .`, review the staged diff, then commit
without bypassing hooks. Subject format:

`🚀🐺 ↝ [SSL-123]: Concise outcome`

Use two distinct non-face emoji and every worked SSL key. Rebase and push to
`cycle/4`, then add the proof and remaining caveats to Linear.

## Map

| Area | Web | iOS |
| --- | --- | --- |
| Routing | `web/components/game/GameScreenRouter.tsx` | `native/App/RootView.swift` |
| Independent scene | `web/app/game/stage/` + `web/lib/devPresets.ts` | `native/App/SceneCatalog.swift` |
| Missions | `web/components/game/Mission*`, `web/lib/mission-flow.ts` | `native/App/Screens/FlightScreens.swift`, `native/LandnamCore/.../Mission*` |
| Mining | `web/components/game/screens/MiningScreen.tsx` | `native/App/Scenes/MiningScene.swift` |
| Scene contracts | `shared/authoring/` + `web/lib/engine/` | `shared/authoring/` + `LandnamCore/Scene/` |
| State and sync | `web/lib/game-state*.ts`, `web/lib/offline/` | `native/LandnamCore/Sync/`, `native/App/Store/` |

Read `docs/agents/product.md` for product rules, `docs/agents/studio.md` for
scene authoring, and `docs/agents/testing.md` before calling a ticket complete.
