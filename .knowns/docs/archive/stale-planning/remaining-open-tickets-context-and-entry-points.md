---
title: Remaining open tickets — context and entry points
createdAt: '2026-03-06T04:39:41.218Z'
updatedAt: '2026-03-10T08:50:26.753Z'
tags:
  - backlog
  - context
  - session-handoff
description: >-
  Operational map of remaining open tickets and where to start implementation in
  code
---
## Status at end of 2026-03-06 session

All HIGH priority tickets are closed. Remaining work is MEDIUM priority.

---

## In Progress

### yn7owq — Ensure procedural generation for targets
Every target must have unique terrain, minerals (quantity), and landmarks.
- **Entry point**: `scene/Scripts/UI/SidescrollMining.gd` (terrain generation, `_mineral_regions`), `scene/Scripts/Utils/ResourceYield.gd` (mineral quantities per target)
- **Context**: Terrain is drawn procedurally via `_terrain_points` but may use the same seed pattern. `ResourceYield.get_yield_for_target()` may return fixed quantities regardless of target ID. Seed the RNG from `target_id` to make quantities and terrain unique per target.

---

## Todo (medium priority)

### 6zmy8j — PWA game-focused layout when installed
- **Entry point**: `react-shell.js` — `isPwaMode()` already exists; slim header logic partially present
- **Context**: `isPwaMode()` checks `display-mode: standalone/fullscreen` and iOS `navigator.standalone`. When true, render a minimal bar with Exit button; game iframe fills `100svh`. Exit = `history.back()` or `window.close()`.

### ijt1p5 — PWA install prompt on mobile web
- **Entry point**: `react-shell.js` — `isMobile`, `beforeinstallprompt` event already captured in shell
- **Context**: Show a dismissible banner ~2s after load on mobile non-PWA sessions. Three actions: (1) Fullscreen API, (2) `deferredPrompt.prompt()` on Android, (3) iOS share sheet instructions. Use `localStorage` to suppress after dismiss.

### wwyaez — First mission reward bonus (150% payout)
- **Entry point**: `scene/Scripts/Utils/ResourceYield.gd` or `scene/Scripts/Earth/MissionDebrief.gd`
- **Context**: First mission payout should be ~150% of rocket cost (SR1 = 1,000,000,000). Subsequent missions normalise to ~115%. Gate on `RocketsManager.get_mission_stage() == 1` or a "first_debrief_complete" flag in persisted state.

### i5w6mi — Next mission card on base screen after debrief
- **Entry point**: `scene/Scripts/Earth/MissionDebrief.gd`, `scene/Scripts/Earth/LaunchpadScene.gd` or `SatelliteStation.gd`
- **Context**: After first debrief resolves, post a persistent CTA on the base screen: "Mission 2 available — launch from the Launchpad." Trigger once when `mission_stage` advances past 1.

### ifkjpb — In-game guide / button handbook
- **Entry point**: `scene/Scripts/UI/SidescrollMining.gd`, `scene/Scripts/Earth/MissionDebrief.gd`
- **Context**: Tester feedback: players don't know what buttons do. Add a tappable `?` icon per screen that opens a small overlay with plain-language descriptions of each visible button. Pattern: programmatically built PanelContainer overlay, like the Ship Status panel added in r8mxvw (OutboundPreviewTransition.gd).

### o59h32 — Starter Rocket 2 unlock celebration beat
- **Entry point**: SR2 unlock notification — check `scene/Scripts/Earth/MissionDebrief.gd` and `react-shell.js` LEVEL_UNLOCK_HINTS
- **Context**: Shell already has a level-up banner with 4s auto-dismiss and haptic feedback (`vibrate([80,60,120])`). Find the SR2 unlock trigger and add: visual flash (gold background pulse), hold 2-3s. Communicate SR2 stats: 2x speed, 2x range, 1.5x cargo.

### qf9btm — Star map placeholder on base screen
- **Entry point**: base earth scene (GDScript). `RocketsManager` has completed mission/target history.
- **Context**: Add a panel to the Earth base screen showing discovered targets. Format: "Discovered: N targets" with a short list. Placeholder — no interactive map needed yet.

---

## In Review (awaiting human decision)

These are blocked on art/visual direction, not code:

- **5l30r4** — Weather events and skymap: design exploration, no clear AC, needs direction
- **37wan4** — Background/rocket pixelation mismatch: visual asset quality decision (Tom investigating)
- **kcd956** — Rocket 1 sprite sheet separation: art asset task, parent mzl2k8

---

## Key files for context

| File | Relevance |
|------|-----------|
| `react-shell.js` | PWA tasks (6zmy8j, ijt1p5): `isPwaMode()`, `isMobile`, `beforeinstallprompt` |
| `scene/Scripts/Utils/ResourceYield.gd` | Payout multiplier (wwyaez), resource quantities (yn7owq) |
| `scene/Scripts/Earth/MissionDebrief.gd` | First mission reward (wwyaez), next mission CTA (i5w6mi), SR2 unlock (o59h32) |
| `scene/Scripts/UI/SidescrollMining.gd` | Terrain/mineral proc gen (yn7owq), button guide (ifkjpb) |
| `scene/Scripts/Utils/RocketsManager.gd` | Mission stage, target history (qf9btm, i5w6mi) |
