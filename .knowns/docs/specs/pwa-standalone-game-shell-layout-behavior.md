---
title: PWA standalone game shell layout behavior
createdAt: '2026-03-07T01:13:55.727Z'
updatedAt: '2026-03-10T06:12:31.851Z'
description: Detection and layout rules for installed/mobile standalone experience
tags:
  - pwa
  - mobile
  - ux
---
# PWA Standalone Game Shell Layout Behavior

## Goal
When opened as an installed/mobile standalone app, render minimal shell chrome and maximize visible game area.

## Detection Rules
`isPwaMode()` should return true when any condition is true:
- `display-mode: standalone`
- `display-mode: fullscreen`
- `display-mode: minimal-ui`
- iOS Safari standalone (`window.navigator.standalone === true`)
- active fullscreen element (`document.fullscreenElement`)

## Layout Rules
- Root container uses `height: 100svh` and `min-height: 100svh`.
- Render a slim top bar with an Exit button and short product label.
- Top bar should respect iOS notch area via `env(safe-area-inset-top)`.
- Game iframe fills all remaining vertical space (`flex: 1`, `height: 100%`, `width: 100%`).

## Exit Behavior
- Exit button first leaves browser fullscreen (if active).
- Then tries `window.history.back()` when history is available.
- Otherwise calls `window.close()` as fallback.

## Follow-up Scope
Future iterations can add explicit fallback navigation target for environments that block `window.close()`.


## Mobile Install Banner (Non-PWA)
- Show mobile banner ~2 seconds after load for non-PWA sessions only.
- Include:
  - Open Fullscreen: calls Fullscreen API (`requestFullscreen`)
  - Install App (Android): triggers deferred `beforeinstallprompt` flow when available
  - Add to Home Screen (iOS): shows share-sheet instructions
  - Dismiss action (`×`) to hide banner
- If `beforeinstallprompt` is unavailable, show fallback install guidance text.



## 2026-03-10 Safe-Area Enforcement Update
- Keep background full-screen/edge-to-edge.
- Inset all fixed interactive controls from cutouts/notches/dynamic-island/gesture regions using top/right/bottom/left safe-area env vars.
- Keep HUD compact and auto-hide to reduce gameplay obstruction.
- Use matrix/checklist in @doc/specs/mobile-safe-area-compatibility-matrix-pwa-shell for regression coverage.
