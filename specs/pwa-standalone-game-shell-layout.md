# PWA Standalone Game Shell Layout Behavior

**Status:** Implementation-ready
**Task:** @task-jc4qss

## Overview

Defines how the game shell (`web/app/game/page.tsx` → `GameApp.tsx`) renders
and behaves when installed as a PWA in `standalone` display mode. The goal is a
full-bleed canvas — portrait on mobile, full-viewport on desktop/landscape —
that hides browser chrome and adapts to device safe areas. Every screen must
support landscape/desktop mode (see `Landnam/CLAUDE.md` design rules); the
game is not portrait-only.

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

The `portrait-canvas` class applies the mobile-width constraint below the
1024px desktop breakpoint; at desktop widths the canvas fills the full
viewport instead (see `web/app/globals.css`'s `@media (min-width: 1024px)`
rules). Safe area insets handle notch/home-indicator overlap on iOS and Android.

## Status bar color

`<meta name="theme-color" content="var(--ln-void)">` (deepest background) ensures
the system status bar matches the game background in standalone mode.

## Splash screen

`web/public/manifest.webmanifest` defines `background_color` matching `--ln-void`
and `icons` at 192×192 and 512×512. No custom splash image is needed — the
browser generates one from these fields.

## Orientation

`web/public/manifest.webmanifest` sets `"orientation": "any"` — landscape/desktop
is a first-class supported mode, not locked out. Screens are responsible for
their own responsive layout at the 1024px desktop breakpoint (e.g.
`TessDiscoveryScreen.tsx`'s two-column desktop layout).

## Implementation tasks identified

1. **Add standalone detection** in `web/app/layout.tsx` — set `data-pwa` on `<body>`.
2. **Add safe-area CSS** to `web/app/globals.css` under the `[data-pwa="standalone"]`
   selector.
3. **Verify `manifest.webmanifest`** has `"display": "standalone"`, `"orientation": "any"`,
   and matching `background_color`.
4. **E2E smoke test** — Cypress `cy.window().its('matchMedia')` stub or visual
   screenshot in standalone viewport, at both mobile and desktop widths.

## References

- `web/app/game/page.tsx` — game entry point
- `web/app/globals.css` — CSS token definitions, portrait-canvas class, and the
  1024px desktop breakpoint
- `web/public/manifest.webmanifest` — PWA manifest
- `specs/runtime-strategy-decision.md` — confirms PWA + Tauri strategy
