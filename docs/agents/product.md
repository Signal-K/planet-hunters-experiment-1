# Product and surfaces

Part of the Landnam agent instructions; `AGENTS.md` (repo root) is the entry point and wins on conflict. Read for product scope, base scene, dock, mining, visual and tech rules.

## Product (Cycle 4)

- Landnám is a space-program game: Next.js web app in `web/` and SwiftUI iOS app in `native/`. They share one game model and one look; new features must not be web-only by design.
- Cycle 4 scope: **Free Ops** (self-directed play with no contract required: mine, survey, build, trade on your own) plus **optional contracts** from clients. Contracts add direction and payout; they are never a gate to playing.
- Scenes: every gameplay screen is a real illustrated or rendered scene with the action attached to an object or instrument in it. A card grid, generic "available actions" stack, or text-and-buttons panel is not acceptable as a gameplay screen. Cards are for reference and menu surfaces only. Reuse the existing scene component when matching another screen; do not re-tune an approximation. Resolve a mechanic from the real component (`GameScreenRouter.tsx`), not from a screen's name ("Transit" means two different things).
- Accounts: no account-free play. No guest mode, demo routes, or "no account needed" links.
- Offline-first: no direct client writes to the backend; use the SSL-321 outbox and upload on reconnect. Check phone sizes and Safari.
- Terminology: "client", never "contractor", in UI copy, survey copy and new identifiers.
- Narrative: the active game is the five-stop agency loop: Plan, Launch, Flight, Work, Result. Every screen has a role in `web/lib/narrative-surface.ts`; decisions and evidence are in `docs/narrative-audit.md` (2026-10-24). Citizen science is an instrument feed, not a mission track. Base services (Exchange, Earth refinery, Hangar) and extensions (instruments, rover) stay but never become mission tracks. Deleted 2026-10-24: Academy, crew, Skills, Sites and Surface Ops, treasury and loans, site rights, field sandbox and crafting, Friends, Community hub, Narrative Ledger, off-world construction and remote silo (the on-planet silo and a rover left on site came back on 2026-10-30, see the mining scene-flow rule below). Not started: off-world refinery, colonies, settlements. Satellite Monitoring Station is deleted; do not revive it.
- Roadmap: the Narrative Ledger screen (`web/lib/data/narrative-ledger.ts`, mirrored in `NarrativeLedger.swift`) is the roadmap. A system removed before launch stays listed there as planned, with how it was previously built; Friends and the Orionids / World Space Week events are core and ship this week. Do not delete either again.
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
- Every screen must work in phone portrait, phone landscape, and desktop web layouts; native acceptance is iPhone only.
- No emoji in the UI. Status = shape + color + label. UPPERCASE with letter-spacing for instrument labels and CTAs.
- When a redesign removes UI, build new theme-matching elements; never restore the old ones.

## Tech and layout

- `web/` Next.js 16 (App Router, SPA at `app/game/page.tsx`), TypeScript strict (no `any`, no `@ts-ignore`), Tailwind v4, Framer Motion, PixiJS scenes (`web/public/game/scenes/*.scene.json`). This is not the Next.js you know: read `web/node_modules/next/dist/docs/` before Next-specific code.
- `native/` is the iOS SwiftUI app (`LandnamCore`, `TakeonKit`); `pocketbase/` is the Landnam backend. Hub-and-spoke auth uses the shared backend. No desktop targets, Godot, Electron, or browser runners.
- Run `npm` from `web/`; run `git` from the repo root.
- Key files: `web/game-context.tsx`, `web/lib/data.ts`, `web/lib/catalog.ts`, `web/components/game/GameApp.tsx`.
- Docker must start fully offline; never add a start-time network fetch.
- PostHog survey IDs in code must resolve to real, live, non-blocking surveys.
- Local PocketBase superuser (local only): `liam@skinetics.tech` / `ThisIsATestPassword`. Never point local tooling at a deployed instance.

## Pacing rule for missions and scenes (Liam, 2026-10-24)
Mining controls (SSL-708, Liam 2026-10-29), every mining scene and mission (Mining, Orionids shower, transport and self-directed runs), web and iOS: nothing sits across the top of the scene except one Menu button top-left; the menu holds the mission, objective and progress, the hold, how to play, recharge, switch mission, return to hub, settings and scrub. D-pad bottom-left, one round FIRE bottom-right with the laser charge as its ring, progress between them. The ship starts about a quarter of the way in, not at the left edge. The run states its goal once in the middle of the scene when it starts, then clears. FIRE never drops a press (presses during cooldown are buffered). The screen flashes or shakes only for a real hit or a real collision, measured against the ship as drawn; a miss or an early press gives no impact feedback. This replaces the shared top HUD inside mining. When to fire must be obvious (SSL-710): deposits sit on a dark backing with a mineral-coloured rim, a dashed aim line drops from the ship to the laser's reach and turns solid on a seam that a shot fired now would hit (judged where the seam will be when the beam lands), and FIRE turns solid while that is true. Level 1 mining (starting laser) keeps every deposit just under the crust, inside the starting laser's reach; deeper levels are defined in SSL-712.

A mining run, catch or other scene objective should finish in about one minute of play and must need some weaving or varied input, not the same action held for the whole minute. Tune the spawn rate and the catch window so a player who stays put gets roughly a quarter to half of the goal and a player who steers under the targets finishes in under a minute. Orionids shower run: `ORIONIDS_RUN_FRAGMENTS_PER_MINUTE` (web `lib/data/sky-events.ts`, native `OrionidsRun.fragmentsPerMinute`). Catching (SSL-711, Liam 2026-10-29): fragments fall only in the shower run, never in ordinary mining (which keeps just the streaks and the fireball). A short light beam rises from the ship; a round CATCH button sits up and to the left of FIRE and turns solid while a fragment is inside the visible beam. Pressing it catches that fragment ("Caught +1"); an empty press costs nothing, and a press up to 0.25 s early still counts. A fragment takes at least 3.2 s from appearing to reaching the ship on every screen (slower on a short landscape phone), so touch players have time to see it, steer and tap. The button is the mining run's general second action (`web/lib/mining/secondaryAction.ts`, authored as `action-button` in mining.toml): a new mission or event that needs a second verb adds a case there instead of building another button. Nothing collects itself: a fragment that reaches the ground breaks up. FIRE stays for ground seams.

## Cycle 7 rules (Liam, 2026-10-29; full notes in `notes/decisions/`)

- Cycle 7 goals: Community research, and launching a rocket anywhere with always something to do (mine, sell, build probes, rover trips). Work that serves neither waits.
- Two-tone mission style is the UI standard: two translucent coloured halves, dark rounded panels, cream text, cyan accents, gold rewards, the cream contract button as the CTA. The old white, square panels, dialogs and buttons are retired; move a screen over when you touch it and never add new ones. One idea per panel, a sentence or two.
- Instrument data is seen through the instrument: a console window framed by dials or switches that really change the view, with a person (radio desk, control room) briefing in short lines.
- Each sky event has a community instrument the players launched together (DRA-1, ORI-1, LEO-1, GEM-1; `SkyEvent.communityInstrument`).
- Event badges come from a chain of three missions joined by story items, never from mining alone; each debrief hands over the item and points to the next mission, and every chain feeds Community research (`web/lib/orionids/chain.ts`).
- Phone browsers prefer portrait (Safari's bars take a third of a landscape screen): a sideways phone in a tab is asked to turn upright or install. Every scene must look its best upright. Navigation takes as little of the scene as possible.
- Until iOS can reach TestFlight, web and the installed PWA come first; iOS parity is caught up afterwards.
- Mining missions follow one scene flow: Hub, Map, Review and Launch, Transit, destination, work, return, debrief. Mission-first and map-first both end on one Review and Launch screen (destination facts, the missions there, Back, Launch). The map shows only owned or reachable bodies and highlights the ones that suit the mission. Laser or rover is picked before launch; what the haul is for is settled at the debrief. Scanning never gates mining. Settlements wait for cycle 9. Answered 2026-10-30: a haul can be stored in an on-planet silo and a rover left on site; contract cargo goes to Earth unless the contract says otherwise; rover surface mining uses signal-k/takeon; the "Where to get it" guide waits.
