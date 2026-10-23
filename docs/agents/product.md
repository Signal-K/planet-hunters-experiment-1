# Product and surfaces

Part of the Landnam agent instructions; `AGENTS.md` (repo root) is the entry point and wins on conflict. Read for product scope, base scene, dock, mining, visual and tech rules.

## Product (Cycle 4)

- Landnám is a space-program game: Next.js web app in `web/`, SwiftUI native app in `native/` (cross-platform direction: web and native share one game model and one look; new features must not be web-only by design).
- Cycle 4 scope: **Free Ops** (self-directed play with no contract required: mine, survey, build, trade on your own) plus **optional contracts** from clients. Contracts add direction and payout; they are never a gate to playing.
- Scenes: every gameplay screen is a real illustrated or rendered scene with the action attached to an object or instrument in it. A card grid, generic "available actions" stack, or text-and-buttons panel is not acceptable as a gameplay screen. Cards are for reference and menu surfaces only. Reuse the existing scene component when matching another screen; do not re-tune an approximation. Resolve a mechanic from the real component (`GameScreenRouter.tsx`), not from a screen's name ("Transit" means two different things).
- Accounts: no account-free play. No guest mode, demo routes, or "no account needed" links.
- Offline-first: no direct client writes to the backend; use the SSL-321 outbox and upload on reconnect. Check phone sizes and Safari.
- Terminology: "client", never "contractor", in UI copy, survey copy and new identifiers.
- Narrative: no fictional wrapper on mainline citizen-science content. Citizen science is an instrument feed, not a mission type. Crew have no citizen-science role. Satellite Monitoring Station is deleted; do not revive it.
- Do not treat any "M1/M2 active, M3 undefined" onboarding framing as current scope. Onboarding mission order is whatever the current release issue and ZenNotes decisions say.

## Names and surfaces
6. Never show scene titles ("Base", "Earth HQ", "Earth Base") anywhere, web or native. They are internal names only.
7. Mining default is ship mining with the laser, exactly as in the webapp. Laser mining is canonical. Rover/Takeon is a separate surface mode and never hijacks laser mining.
8. The dock is `‹ ›`, Build and Menu (Liam, 16 Oct: the Hub screen is not a main menu). The Menu lists Build, New mission and Marketplace first, then the other places. Base-only features (for example Subsurface) are opened from the base scene, not the dock.
9. Exchange (Market) stays a real building on the base, not a menu item.

## Base scene
10. No planet discs in the base sky (a planet is only a point of light from the sky calendar). No people walking at this stage.
11. The background is game objects, never a whole-scene image (Liam, 14 Oct): every piece (escarpments, steppe, paved ground, clouds, weather, sky events) is an entity in `shared/scenes/base-world.json`, stepped by the shared world sim (web `lib/world`, native `LandnamCore/World`, pinned by `world-fixture.json`). Sky events come from `shared/scenes/sky-events.json`. Everything is animated.
12. Setting and kit (14 Oct, replaces base-kit-v6): a paved launch complex on flat steppe with low escarpments on the horizon (Baikonur, not mountains, not forest). The world starts empty; buildings are only what the player builds, on fixed sites from `shared/layout/base-site.json`. Art is kit v7 (`tools/blender/kit_v7.py`, `models/base_v7.py`, `terrain_v7.py`, `steppe_v7.py`), built and checked in the live Blender: Crashlands / Out There: Omega surface, Tiny Space Program / Starbound side view tipped 14 degrees, white panelled hulls with blue trim, navy ink outline, no orange or green. Silos underground only.
13. Palette is the deep dusk palette in `docs/design/game-theme-spec.md` (section 2). No flat constant colour.

## Visual rules (never violate)

- Colour: the spec's deep dusk palette (`docs/design/game-theme-spec.md`, section 2) governs scene and world art. Supersedes the earlier "light blueprint, no dark, no orange or purple" rule for scene layers. Orange is a small detail accent only. UI chrome on top of the world follows the spec's section 2.4.
- Body and map text at least 14px. Tap targets at least 44px. 8pt spacing rhythm.
- Shared palette source: `shared/tokens/tokens.json`, generated into `web/app/globals.css` and `native/App/Theme.generated.swift`. Web consumes CSS variables; native consumes `Theme`. Never hand-edit generated blocks or invent per-platform colors. World tokens currently live outside the generated block; preserve the game-theme spec and check both implementations. Read `projects/landnam/decisions/landnam-ui-design-language-style-prompt.md` and the `:root` comment in `globals.css` before visual work, since direction has changed several times.
- Every screen must work in phone portrait, phone landscape, and desktop.
- No emoji in the UI. Status = shape + color + label. UPPERCASE with letter-spacing for instrument labels and CTAs.
- When a redesign removes UI, build new theme-matching elements; never restore the old ones.

## Tech and layout

- `web/` Next.js 16 (App Router, SPA at `app/game/page.tsx`), TypeScript strict (no `any`, no `@ts-ignore`), Tailwind v4, Framer Motion, PixiJS scenes (`web/public/game/scenes/*.scene.json`). This is not the Next.js you know: read `web/node_modules/next/dist/docs/` before Next-specific code.
- `native/` SwiftUI app (`LandnamCore`, `TakeonKit`); `pocketbase/` Landnam backend; shared PocketBase at `~/Navigation/backend`. Hub-and-spoke auth via the shared backend. No Godot, no Electron.
- Run `npm` from `web/`; run `git` from the repo root.
- Key files: `web/game-context.tsx`, `web/lib/data.ts`, `web/lib/catalog.ts`, `web/components/game/GameApp.tsx`.
- Docker must start fully offline; never add a start-time network fetch.
- PostHog survey IDs in code must resolve to real, live, non-blocking surveys.
- Local PocketBase superuser (local only): `liam@skinetics.tech` / `ThisIsATestPassword`. Never point local tooling at a deployed instance.
