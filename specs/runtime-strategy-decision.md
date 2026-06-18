# Decision: Runtime Strategy for Offline-Capable Game Client

## Status: Decided

**Decision: Adopt PixiJS for game scenes + Tauri for desktop + service worker for PWA offline support, keeping React for UI shell.**

The game client uses Next.js 16 + React 19 for the UI layer and migrates interactive game scenes (mining, transit, asteroid fields) to PixiJS over WebGL, with Canvas2D fallback for low-end mobile. Tauri provides the native desktop packaging. A service worker using Workbox precaches the app shell for PWA/offline.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Tauri (desktop)                     │
│  ┌─────────────────────────────────────────────────┐│
│  │          PWA / Service Worker (offline)          ││
│  │  ┌─────────────────────────────────────────────┐ ││
│  │  │      React 19 / Next.js 16 (UI shell)       │ ││
│  │  │  TopBar, Panel, Button, Hub, Market, etc.   │ ││
│  │  └──────────┬──────────────────────────────────┘ ││
│  │             │  bridge (props/refs/events)         ││
│  │  ┌──────────▼──────────────────────────────────┐ ││
│  │  │       PixiJS Canvas (game scenes)            │ ││
│  │  │  Mining minigame, Transit animation,         │ ││
│  │  │  Asteroid field, Rocket effects              │ ││
│  │  └─────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## Rationale

### 1. Rendering: PixiJS (WebGL with Canvas2D fallback)

| Library | WebGL | Canvas2D fallback | Bundle size | React integration | Mobile perf |
|---------|-------|-------------------|-------------|-------------------|-------------|
| **PixiJS** | Yes | Built-in | ~450 KB gzip | Good (wrapper exists) | Excellent |
| Three.js | Yes | No (WebGL only) | ~650 KB gzip | Good | Poor on mid-range |
| Phaser | Yes | Limited | ~1 MB gzip | Tight coupling | Good |
| Raw Canvas2D | No | Native | 0 KB | Manual | Best |

Why PixiJS:
- Purpose-built for 2D game rendering — mining minigame, transit scenes, asteroid fields are all 2D. Three.js is overkill (3D engine for 2D content adds complexity and perf overhead).
- Built-in Canvas2D fallback when WebGL is unavailable or low perf — critical for mid-range mobile coverage.
- Lighter than Phaser (~450 KB vs ~1 MB). Phaser's full game framework (physics, audio, scenes, input) overlaps with React's role.
- Straightforward to embed in React via a canvas ref and lifecycle wrapper — existing React state management stays untouched.
- Existing rAF + DOM approach works for v0 but won't scale to particle effects (rocket trails), smooth parallax (transit), or many simultaneous sprites (asteroid field).

Migration path:
- Phase 1: Wrap PixiJS in a `GameCanvas` component that accepts imperative commands (spawn ore, fire laser, animate transit). MiningScreen switches from DOM ore nodes to PixiJS sprites.
- Phase 2: TransitScreen transition animation moves from CSS to PixiJS.
- Phase 3: Add particle system for rocket exhaust and asteroid debris.

### 2. Desktop: Tauri

- Bundle size: ~5 MB (vs Electron ~150 MB).
- Memory: ~50 MB idle (vs Electron ~150+ MB).
- Native APIs: Filesystem access, window management, system tray — all through Rust backend.
- Security: No Chromium sandbox bypass concerns.
- Development: Uses existing web frontend unchanged, swaps out Next.js dev server for Tauri dev.
- Cross-platform: macOS, Windows, Linux from one codebase.

Electron was rejected because:
- 30x larger bundle for the same web app.
- Higher memory usage on resource-constrained machines.
- Tauri v2 is stable and mature enough for the app's native needs (window management, filesystem for save exports).

### 3. Offline/PWA: Service Worker (Workbox)

- Next.js `next.config.ts` `output: "standalone"` already set — good foundation.
- Use `@serwist/next` (maintained fork of `next-pwa`) to generate a service worker that precaches the app shell and runtime-caches game data.
- Game state already persists to localStorage (`game-context.tsx`).
- PocketBase writes are fire-and-forget — the game functions entirely from localStorage; server sync is best-effort.
- Service worker caches:
  - App shell (HTML, JS, CSS, fonts) — precached at install time.
  - Game data JSON (catalog, missions, targets) — stale-while-revalidate.
  - PixiJS assets (sprites, textures) — cache-first.

### 4. UI stays in React

- Screens like Hub, Market, Mission Board, and Refinery are UI-heavy — they stay in React/Tailwind.
- Only interactive game scenes (Mining, Transit, Asteroid fields, Rocket animations) move to PixiJS.
- This avoids a costly full rewrite and preserves the existing 13 screen components.

## Decision Record

| Dimension | Decision | Why not alternative |
|-----------|----------|-------------------|
| Game rendering | PixiJS (WebGL + Canvas2D fallback) | Three.js: 3D overkill; Phaser: too coupled; raw Canvas: too manual |
| Desktop packaging | Tauri v2 | Electron: 30x larger bundle, more memory |
| Offline strategy | Service worker + localStorage | Already partially in place; matches requirements |
| UI framework | React 19 / Next.js 16 (unchanged) | Full rewrite to game engine is unnecessary |

## What Was Deferred

- Native mobile app (iOS/Android) — use PWA install for now; Tauri mobile is experimental.
- Multiplayer/sync — PocketBase will handle auth + state sync; service worker layer is read-only.
- Audio engine — PixiJS does not include audio; Web Audio API or Howler.js can be added per-scene.
- Physics engine — not needed for v0 mining minigame; Matter.js can be added later if asteroid collision is needed.
