# AGENTS (canonical, Landnam)

## Read first: token budget and repo map

Agents (Codex, Claude Code, Cursor) pay for every byte they read. This repo is ~117 MB tracked but only ~7 MB is text, and most of that is not what you need.

Rules (mandatory)
- Read only what the task needs. Start from the map below and the area file (`web/AGENTS.md`, `native/AGENTS.md`, `pocketbase/AGENTS.md`), not from a repo scan.
- Search with `rg -n PATTERN path/` (respects `.ignore`), then read a window (`sed -n '120,200p' file`). Never `cat` a whole large file and never chain several `cat`s in one command.
- Never cat or open: `web/app/globals.css` (190 KB, use `rg -n 'token-name' web/app/globals.css`), `web/package-lock.json`, `*-sheet.json`, `web/lib/contexts/useGameLoop.ts` / `pocketbase/main.go` whole (rg first), anything in `.ignore` / `.cursorignore`.
- Images: view the art reference as `docs/art-reference-sm.jpg` (129 KB), not `docs/art-reference.png` (1.9 MB, ~15x the tokens). View one screenshot at a time, never contact sheets of full-res captures.
- Tests: run the single file you touched (`cd web && npm run test:file -- lib/foo.test.ts`, `swift test --filter LoopTests` in `native/LandnamCore`). Run the full suite once, at the end.
- Noise paths are listed in `.cursorignore` (Cursor), `.ignore` (ripgrep, so Codex/Claude Code/Cursor search) and `.claude/settings.json` (Claude Code deny-read). Keep the three in sync.

Standing rules (short form; details below)
- One commit with ALL changed files, only after real work. Subject: two different emoji + `↝ [SSL-123]: outcome`. Push to `cycle/4`.
- No scene titles in UI. One shared HUD on every screen (web `components/game/hub/` + `SyncStatus`, native `App/Screens/SharedHud.swift`), never a per-screen HUD.
- No orange or green UI colour (user rule, newest wins over older docs). Colours only from CSS variables / `shared/tokens`.
- PocketBase is the only state store (via the outbox, no direct client writes). The TestFlight workflow was deleted (Liam, 21 Oct); do not upload to TestFlight or recreate the workflow without asking.

Map (where things live)

| Feature | Web (`web/`) | Native (`native/`) |
|---|---|---|
| Shell / routing | `components/game/GameApp.tsx`, `GameScreenRouter.tsx`, `lib/game-screens.ts` | `App/RootView.swift`, `LandnamCore/.../Model/Screen.swift` |
| Base (hub) | `components/game/screens/HubScreen.tsx`, `components/game/hub/*` (BaseDock, BaseLayerScene) | `App/Screens/HubScreen.swift`, `BaseWorldScene.swift`, `BaseDock.swift`, `BaseCamera.swift` |
| Mining (laser) | `screens/MiningScreen.tsx`, `MiningCanvas.tsx`, `MiningControls.tsx`, `lib/mining/*`, `lib/engine/scripts/MiningController.ts`, `lib/systems/MiningSystem.ts` | `App/Scenes/MiningScene.swift`, `App/Mining/*`, `LandnamCore/.../Mining/*` |
| Mission flow | `MissionSetupRoutes.tsx`, `MissionOperationRoutes.tsx`, `MISSION_SETUP_FLOW.md`, `lib/mission-flow.ts`, `lib/data/mission-generator.ts`, `lib/systems/MissionRunLifecycle.ts`, screens `Launchpad/Transit/Landing/Delivery/Debrief` | `App/Screens/CoreLoop.swift`, `FlightScreens.swift`, `LandnamCore/.../Systems/Loop.swift`, `MissionBoard.swift` |
| Hangar | `screens/HangarScreen.tsx`, `lib/data/shipCustomizer.ts`, `lib/rockets.ts` | `App/Screens/CoreLoop.swift` (rocket yard), `LandnamCore/.../Data/Rockets.swift` |
| Exchange (Market) | `screens/MarketScreen.tsx`, `lib/systems/EconomySystem.ts` | `LandnamCore/.../Systems/Market.swift`, `Data/Economy.swift` |
| Settings | `components/game/SettingsSheet.tsx` | `App/Screens/HubScreen.swift` (settings sheet), `App/OrientationPreference.swift` |
| Sync / state | `game-context.tsx`, `lib/game-state*.ts`, `lib/sync/*`, `lib/offline/*`, `lib/contexts/useAuthSync.ts`, `components/game/LandnamSyncStatus.tsx` | `LandnamCore/.../Sync/*`, `Store/GameStore.swift` |
| Backend | `lib/pb*.ts` | `pocketbase/` (Go hooks, `pb_migrations/`) |
| Design tokens | `app/globals.css` (rg only), `shared/tokens/tokens.json` -> `npm run sync:shared` | `App/Theme.swift` (`Theme.generated.swift` is generated) |
| Scene scripts, Studio | `shared/authoring/` (TOML, schemas, notes), `app/game/studio/`, `lib/authoring/`, `scripts/authoring.mjs`, `scripts/studio.mjs` | `AuthoredMissions.swift` + generated `AuthoredMissions.generated.swift` |

This is the single source of agent instructions for the Landnam repo. `CLAUDE.md` imports this file; `web/AGENTS.md` and `web/CLAUDE.md` are thin pointers. Do not copy rules into other files.

## Rules of the game (Liam, standing, mandatory)

Process
1. Commits: commit ALL files with changes, in one commit, and only after real work (a finished, coherent unit: feature, fix, ticket). No tiny or frequent commits, no WIP, checkpoint, CI-poke or one-line churn commits. See "Commit" below for the format.
2. Branching: work directly on `cycle/4`. No feature branches. Never push to `main` directly; the release path is a PR from `cycle/4` into `main` (CI required must pass), and the merge deploys the web Worker (no TestFlight upload).
3. No waiting on CI. CI runs typecheck, unit tests, build and Playwright scenes. Run relevant local checks to completion; do not poll CI or block delivery on its queue. Report CI and deployment as unverified unless actually checked.
4. Done means proof: nothing is "done" without a viewed screenshot of the running build. Every ticket carries a "Done when" line. Close your own Linear tickets. When the fix is on `cycle/4` and your own checks pass (typecheck, the relevant tests, and screenshots you have looked at), mark the ticket Done with a short comment giving the commit and the proof. Do not leave it In Review waiting for real Safari or any check you cannot run; say in the comment what was not run.
5. Keep discovery bounded: read the active ticket, its latest comments, applicable decisions and the real implementation. Do not scan historical docs or repeat passed checks without a changed input or unresolved failure.

Names and surfaces
6. Never show scene titles ("Base", "Earth HQ", "Earth Base") anywhere, web or native. They are internal names only.
7. Mining default is ship mining with the laser, exactly as in the webapp. Laser mining is canonical. Rover/Takeon is a separate surface mode and never hijacks laser mining.
8. The dock is `‹ ›`, Build and Menu (Liam, 16 Oct: the Hub screen is not a main menu). The Menu lists Build, New mission and Marketplace first, then the other places. Base-only features (for example Subsurface) are opened from the base scene, not the dock.
9. Exchange (Market) stays a real building on the base, not a menu item.

Base scene
10. No planet discs in the base sky (a planet is only a point of light from the sky calendar). No people walking at this stage.
11. The background is game objects, never a whole-scene image (Liam, 14 Oct): every piece (escarpments, steppe, paved ground, clouds, weather, sky events) is an entity in `shared/scenes/base-world.json`, stepped by the shared world sim (web `lib/world`, native `LandnamCore/World`, pinned by `world-fixture.json`). Sky events come from `shared/scenes/sky-events.json`. Everything is animated.
12. Setting and kit (14 Oct, replaces base-kit-v6): a paved launch complex on flat steppe with low escarpments on the horizon (Baikonur, not mountains, not forest). The world starts empty; buildings are only what the player builds, on fixed sites from `shared/layout/base-site.json`. Art is kit v7 (`tools/blender/kit_v7.py`, `models/base_v7.py`, `terrain_v7.py`, `steppe_v7.py`), built and checked in the live Blender: Crashlands / Out There: Omega surface, Tiny Space Program / Starbound side view tipped 14 degrees, white panelled hulls with blue trim, navy ink outline, no orange or green. Silos underground only.
13. Palette is the deep dusk palette in `docs/design/game-theme-spec.md` (section 2). No flat constant colour.

Platforms
14. Native must match web behavior and appearance. For EACH acceptance slice, implement web, then native iOS/iPadOS and macOS before starting another feature. Compare the same state side by side. Shared SwiftUI code does not prove every destination works; explicitly record each destination checked or blocked.

## Live preview in the editor (Simple Browser)

Liam watches agent work in the Cursor/VS Code Simple Browser on `http://localhost:3001` (`make up`). Next dev HMR reloads it on every save. To make it also show the page you are editing:
- Claude Code: automatic, a PostToolUse hook in `.claude/settings.json` runs `scripts/preview-target.mjs` on every edit.
- Codex, Cursor and others (no hook): after editing a screen or component, run `node scripts/preview-target.mjs <edited file or /game/route>`. Do this when you start on a screen and whenever you switch to another one.
- Liam opens `http://localhost:3001/game/hub?follow=1` once (`?follow=0` stops it). `web/components/dev/DevFollow.tsx` (dev only) then navigates that tab to the last previewed route via `/api/dev/follow`.
- Every screen and every Hub-only state must be reachable by URL: a gameplay screen is a `/game/<screen>` route (`web/lib/game-screens.ts`), and Hub overlays take query params (`/game/hub?menu=1`, `?building=<kind>`, read in `HubScreen.tsx`). A new scene or overlay must be deep-linkable and added to the map in `scripts/preview-target.mjs`; never make it reachable only by clicking through ephemeral state.
- Use the same dev server for your own checks when you can; do not start a second one on another port for the same checkout.

## Scene Studio (every scene as a script, with Liam's feedback)

`http://localhost:3001/game/studio` (dev only, no login) shows any scene and setup in the real game, with the native snapshot beside it. Each scene is a script, `shared/authoring/scenes/<scene>.toml`, and Liam's notes live beside it. Full guide: `shared/authoring/README.md`.
- At the start of a task run `node scripts/studio.mjs where <ticket or files>` and then `node scripts/studio.mjs focus <scenes> --ticket SSL-123`, so it is clear what scenes you are in. The edit hook keeps it current after that. Open the editor on them with `node scripts/studio.mjs open <scene>`.
- Before changing a scene, read its script, `shared/authoring/feedback/<scene>.toml` and `shared/authoring/instructions/scenes/<scene>*.md` (`node scripts/studio.mjs briefs` lists scenes with open notes). Liam's pins are requirements. A pin marked `wrong` is a standing rule: never bring it back, even once `resolved`. A pin marked `keep` must not change. Objects with `status = "proposed"` are elements he drew for you to build.
- `mode = "fix"`: follow the notes exactly. `mode = "explore"`: he does not know what will look good, so propose at least two genuinely different directions, each fixing every wrong pin, say which traits of his inspiration you borrowed, and show all three viewports. Never answer with a variation of what he rejected.
- When you deliver, set `status = "addressed"` in the feedback file, set `status = "implemented"` on proposed objects you built, and put the handoff in Linear as usual.
- Scene objects and the two compiled missions are authored in TOML. After editing `shared/authoring/**` run `node scripts/authoring.mjs check` (compile writes the runtime files for web and native; CI fails when they are stale). Never hand-edit `shared/scenes/base-world.json`, `shared/missions/*.json` or `AuthoredMissions.generated.swift`.
- Studio scenes use the sandbox stage by default: it removes campaign gates, help, balance and event chrome unless a Thing enables them. Put every independent setup in `[[things]]` and a named, instructed combination in `[[presets]]`.
- Put multi-scene walkthroughs in `shared/authoring/flows/`. Select a flow in Studio to visit its scenes and presets in sequence. Sandbox Things and flows are web-stage only; native snapshots remain legacy checkpoint proof.

## Priority order (highest wins)

1. The user's latest instruction and latest approved specs.
2. The release issue (Linear `SSL-*`): its scope and "Done when" list.
3. Current design decisions (ZenNotes `~/Navigation/workspace`, `projects/landnam/decisions/`, `decisions/`).
4. This repository guidance, then older docs under `docs/` and `specs/`.

Older docs are evidence, not instructions. If a doc or code comment contradicts this file, follow this file and report the doc as stale in the Linear ticket.

## Product (Cycle 4)

- Landnám is a space-program game: Next.js web app in `web/`, SwiftUI native app in `native/` (cross-platform direction: web and native share one game model and one look; new features must not be web-only by design).
- Cycle 4 scope: **Free Ops** (self-directed play with no contract required: mine, survey, build, trade on your own) plus **optional contracts** from clients. Contracts add direction and payout; they are never a gate to playing.
- Scenes: every gameplay screen is a real illustrated or rendered scene with the action attached to an object or instrument in it. A card grid, generic "available actions" stack, or text-and-buttons panel is not acceptable as a gameplay screen. Cards are for reference and menu surfaces only. Reuse the existing scene component when matching another screen; do not re-tune an approximation. Resolve a mechanic from the real component (`GameScreenRouter.tsx`), not from a screen's name ("Transit" means two different things).
- Accounts: no account-free play. No guest mode, demo routes, or "no account needed" links.
- Offline-first: no direct client writes to the backend; use the SSL-321 outbox and upload on reconnect. Check phone sizes and Safari.
- Terminology: "client", never "contractor", in UI copy, survey copy and new identifiers.
- Narrative: no fictional wrapper on mainline citizen-science content. Citizen science is an instrument feed, not a mission type. Crew have no citizen-science role. Satellite Monitoring Station is deleted; do not revive it.
- Do not treat any "M1/M2 active, M3 undefined" onboarding framing as current scope. Onboarding mission order is whatever the current release issue and ZenNotes decisions say.

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

## Fast start and consecutive parity

1. `git status --short`; confirm `cycle/4`. Read the Linear issue and latest comments; retain unrelated work. Run `node scripts/agent-check.mjs` for entry-point and local prerequisite checks.
2. Locate the real web route in `web/components/game/GameScreenRouter.tsx` and native route in `native/App/RootView.swift`. Identify shared model, persistence, analytics and help changes before editing.
3. Implement one acceptance slice on web, then immediately implement the equivalent native behavior in `native/LandnamCore` and `native/App`. Share data in `shared/` where practical; round-trip unknown save fields. Do not defer native to a future ticket by default.
4. Verify the slice using the smallest relevant tests, then compare rendered output. Start independent checks together only when they do not contend for the same server/build directory. While checks run, review diffs or prepare the native counterpart; collect every exit status before claiming success. Never kill unrelated processes, launch duplicate full suites, or blindly rerun deterministic failures.
5. One final batch of broader checks per coherent outcome, then commit/push and update Linear. External blockers must name the unavailable dependency, attempted command and remaining platform acceptance; continue independent work.

Useful commands (from repository root unless specified):

| Purpose | Command |
| --- | --- |
| Agent setup / prerequisites | `node scripts/agent-check.mjs` |
| Shared palette drift | `node scripts/sync-shared.mjs --check` |
| Full shared sources, fonts and art audit | `cd web && npm run sync:shared -- --check` |
| Web types | `cd web && npm run typecheck` |
| Focused logic | `cd web && npm run test:unit -- lib/path/to/file.test.ts` |
| Focused scene at all three sizes | `cd web && npm run test:scenes -- screens.spec.ts --grep 'transport-delivery'` |
| Focused real flow | `cd web && npm run test:scenes -- flow-name.spec.ts` |
| Native domain tests | `swift test --package-path native/LandnamCore --filter TestName` |
| Native destinations | `xcodebuild -list -project native/Landnam.xcodeproj`; use installed destinations |
| Native macOS compile (no windows) | `xcodebuild -project native/Landnam.xcodeproj -scheme Landnam -destination 'platform=macOS' -derivedDataPath /tmp/landnam-derived build CODE_SIGNING_ALLOWED=NO` |
| Native iOS compile | Same command with `-destination 'generic/platform=iOS Simulator'` |
| Native screenshots | `native/Tests/SnapshotTests.swift`, `SCENE` filter, `SNAPSHOT_DIR`; see `native/README.md` |

Local scene retries default to zero; CI may retry infrastructure failures. Use a narrow `--grep` or spec, not the entire scene matrix, while iterating. Use `SCENES_BASE_URL` only for a verified server serving this checkout. Missing tools are a concrete environment blocker, not permission to invent proof. Do not install unrelated toolchains or modify global agent settings.

## Testing and completion contract

Test runner: Playwright scene tests. Cypress has been removed; do not add or run Cypress.

```bash
cd web
npm run test:scenes        # Playwright scene tests (all viewports)
npm run test:scenes:phone  # phone subset
npm run test:unit          # verify:scene-surfaces + vitest
```

"Done" requires all of the following, and the handoff must say exactly what ran and what did not:

1. The change is implemented in the real code path, not only behind a dev preset (presets miss real state-transition bugs).
2. Type-check and relevant tests pass (targeted `test:scenes` for visual or flow-related changes; `test:unit` and native domain tests for logic). Documentation/tooling-only changes need executable checks, not invented gameplay screenshots. Run changed native destinations; keep compile, domain, snapshot and interaction evidence distinct.
3. Rendered-play proof: screenshots of the affected screen(s) at **390x844** (phone portrait), **926x428** (phone landscape) and **1440x900** (desktop). Verify the real viewport (`innerWidth`/`matchMedia`), since a window resize can silently no-op. Look at the screenshots for overlap, clipping, text under 14px, targets under 44px, and wrong colors.
4. Unit tests alone never justify Done or "works". A green suite says nothing about whether the game plays.
5. Never claim a check passed that you did not run. State what ran, what was skipped, and why. Heavy pipelines (20+ minute e2e) are not run per iteration: iterate with targeted local checks and push batched.
6. Do not drive the user's own device or desktop (no osascript clicks, desktop captures, or launching windows). Test headless or in the iOS Simulator.
7. Scene visual check, on every scene task: objects rest on their surfaces with no gaps, and anything that should animate does. Send a short clip or frame strip with the stills.

## Workflow

- Linear `SSL-*` (Landnam team) is the only tracker. Read the ticket first; its scope and "Done when" line define the task. Move status as work progresses. When the fix is on `cycle/4` and typecheck, the relevant tests, and the screenshots you looked at all pass, set the ticket Done yourself and comment the commit plus the proof. Do not park it In Review for Safari or any check you cannot run; name what was skipped in the comment. Put new work, blockers and handoffs (what changed, what was verified, what is left) in Linear, not in repo files.
- Decisions: research in Craft, tracking in Linear, durable decisions and rules in ZenNotes (search ZenNotes first). Landnam has no local decision store.
- Verify claims about existing state yourself (stashes, "pre-existing changes", ticket status that says In Review but has no code). Check `.github/workflows/*.yml` before removing dependencies.

## Commit

- One commit per finished unit of work, after real work only, staging ALL task changes (`git add .`; nothing left uncommitted, exclude only clearly unrelated work, secrets or generated output, and disclose exclusions). Inspect `git status --short` and `git diff --cached` first.
- Subject: `🚀🐺 ↝ [SSL-123 SSL-456]: Concise outcome`. Two different emoji (no flags, no smiley or human faces), the exact `↝` arrow and spacing, every worked ticket key in one bracket pair separated by spaces. Never use `--no-verify`.
- Then `git pull --rebase` and push to `cycle/4`. Post the handoff with the Linear MCP (`save_comment`) and set the status to Done (`save_issue`) when your own checks pass. Do not leave the ticket In Review.
- Landnam is a web app game and a native SwiftUI game. Nothing else; no Godot.
