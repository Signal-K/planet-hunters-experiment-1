# PWA Standalone Game Shell Layout Behavior

**Status:** Implementation-ready
**Task:** @task-jc4qss

## Overview

Defines how the game shell (`web/app/game/page.tsx` → `GameApp.tsx`) renders
and behaves when installed as a PWA in `standalone` display mode. The goal is a
full-bleed portrait canvas that hides browser chrome and adapts to device safe areas.

## Display-mode detection

```ts
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true; // iOS Safari
```

Apply `data-pwa="standalone"` on `<body>` when true. CSS targets
`body[data-pwa="standalone"]` for overrides.

## Viewport and safe areas

```css
/* globals.css — PWA standalone overrides */
body[data-pwa="standalone"] .portrait-canvas {
  height: 100dvh;                      /* dynamic viewport height avoids iOS bar jump */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

The `portrait-canvas` class already enforces portrait orientation. Safe area
insets handle notch/home-indicator overlap on iOS and Android.

## Status bar color

`<meta name="theme-color" content="var(--ln-void)">` (deepest background) ensures
the system status bar matches the game background in standalone mode.

## Splash screen

`web/public/manifest.json` defines `background_color` matching `--ln-void` and
`icons` at 192×192 and 512×512. No custom splash image is needed — the browser
generates one from these fields.

## Orientation lock

`web/public/manifest.json` sets `"orientation": "portrait"` to prevent landscape
rotation. The game is portrait-only per design rules.

## Implementation tasks identified

1. **Add standalone detection** in `web/app/layout.tsx` — set `data-pwa` on `<body>`.
2. **Add safe-area CSS** to `web/app/globals.css` under the `[data-pwa="standalone"]`
   selector.
3. **Verify `manifest.json`** has `"display": "standalone"`, `"orientation": "portrait"`,
   and matching `background_color`.
4. **E2E smoke test** — Cypress `cy.window().its('matchMedia')` stub or visual
   screenshot in standalone viewport.

## References

- `web/app/game/page.tsx` — game entry point
- `web/app/globals.css` — CSS token definitions and portrait-canvas class
- `web/public/manifest.json` — PWA manifest
- `specs/runtime-strategy-decision.md` — confirms PWA + Tauri strategy
