<!-- LANDNAM PROJECT REQUIREMENTS START -->
# Landnam — Agent Instructions

> **Canonical guidance**: Read `KNOWNS.md` in the repository root for full workflow rules. This file covers Landnam-specific repo layout and conventions only.

## Repo Layout

```
~/Navigation/Landnam/          ← this repo (Landnam monorepo root)
~/Navigation/Landnam/web/      ← Next.js frontend (main working directory)
~/Navigation/Landnam/pocketbase/ ← Landnam PocketBase (port 8091)
~/Navigation/backend/          ← shared PocketBase (port 8090)
```

- All `npm` commands run from `~/Navigation/Landnam/web/`
- All git commits from `~/Navigation/Landnam/` (monorepo root)
- **No Godot project exists in this repo.** The game is 100% Next.js/React.

## What this project is

Landnam is a citizen science mining game in the Star Sailors ecosystem.
Players manage a space program: build rockets, accept contractor jobs, fly to
asteroids, mine minerals, classify TESS lightcurve data, sell cargo, and
reinvest. The MVP arc is M1–M3 only (mine asteroid → better rocket + more
minerals → exoplanet visit). No Mission 4, no scanner gate, no XP/level gating.

## Tech stack

- Next.js 16 (App Router, single-page SPA via `app/game/page.tsx`)
- TypeScript strict mode — no `any`, no suppressed errors
- Tailwind CSS v4
- Framer Motion for animations
- PocketBase JS SDK — `pbShared` (port 8090) and `pbLandnam` (port 8091)
- PWA (installable, offline-capable)

## Design system

Tokens are in `web/app/globals.css`. Key CSS variables:
- `--ln-void` — deepest background
- `--ln-panel` — card/panel background
- `--ln-cyan`, `--ln-amber`, `--ln-crimson` — accent colors
- `--ln-font-display` (Oxanium), `--ln-font-body` (system), `--ln-font-mono` (monospace)

Design rules (never violate):
- Portrait canvas only — the game renders in `portrait-canvas` class
- 8pt spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64px only
- No emoji. Status = shape + color + label
- UPPERCASE + letter-spacing for all instrument labels and CTAs
- Hairlines: ghosted cyan at 18% alpha (`--ln-hairline`)

## Backend connections

This project uses a hub-and-spoke PocketBase topology with three backends. For full detail, read @doc/backend-architecture in the parent Navigation Knowns.

**Shared backend** (auth + astronomy data — port 8090, `NEXT_PUBLIC_SHARED_PB_URL`):
- `lib/pb.ts` → `pbShared` connects here
- Collections: celestial_bodies, classifications, ecosystem_profiles, leaderboard_stats, internal_apps
- Auth: users register here, tokens verified by game backends via HTTP delegation

**Landnam backend** (game data — port 8091 Docker / 8093 dev, `NEXT_PUBLIC_LANDNAM_PB_URL`):
- `lib/pb-landnam.ts` → `pbLandnam` connects here
- Collections: game_states (user JSON), classifications, minerals, contractors, locations, rocket_parts, missions_catalog
- Seed data is defined in `pocketbase/main.go` — `ensureCollections()` + `seedCatalog()`

**Auth flow**: User gets JWT from shared backend → sends token to Landnam API → Landnam verifies via shared backend's `/api/collections/users/auth-refresh`.

PocketBase superuser (both): `liam@skinetics.tech` / `ThisIsATestPassword`

## Key source files

| File | Purpose |
|------|---------|
| `web/game-context.tsx` | Central game state, all actions |
| `web/lib/data.ts` | Static game data: missions, targets, parts, MINERAL_META |
| `web/lib/catalog.ts` | PocketBase catalog fetch + static fallback |
| `web/app/game/page.tsx` | Game entry point |
| `web/components/game/GameApp.tsx` | Screen router |

## Progression model (MVP)

- Parts unlock via `missionsRequired` field (not level/XP — those are removed)
- `suggestBuild()` in `data.ts` takes `missionsDone` (not `level`)
- M1 complete → Tier 2 parts unlocked; M2 complete → Tier 3 parts
- Structures unlock by mission count: Control Station after M1, Satellite/Refinery after M2

## Testing

```bash
cd ~/Navigation/Landnam/web
npm run test:unit          # vitest unit tests
npm run cypress:run        # cypress E2E (needs server running)
npm run test:e2e           # start-server-and-test + cypress (offline profile)
```

## Rules

1. TypeScript strict — no `any`, no `@ts-ignore`
2. All colors from CSS variables — no hardcoded hex
3. All spacing from 8pt rhythm
4. No Godot, no Electron, no scene files — this is a web game
5. Read KNOWNS docs for game design decisions before changing game logic
6. Use `appendNotes` in tasks (never `notes` for progress updates)

<!-- LANDNAM PROJECT REQUIREMENTS END -->
