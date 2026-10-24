# AGENTS (canonical, Landnam)

Single source of agent instructions. `CLAUDE.md` imports this file; `web/`, `native/`, `pocketbase/`, `shared/` AGENTS files are thin pointers. Detail lives in `docs/agents/` (read the one your task needs):

| File | Read when |
|---|---|
| `docs/agents/workflow.md` | Starting a task: fast start, platform parity steps, command table, Linear/Craft/ZenNotes |
| `docs/agents/testing.md` | Before claiming Done: completion contract, viewports, scene visual check |
| `docs/agents/product.md` | Product scope, base scene, dock, mining, narrative and tech/layout rules |
| `docs/agents/studio.md` | Scene work: Scene Studio scripts and feedback, live preview |

## Token budget (mandatory)
- Read only what the task needs, starting from the map and the area AGENTS file. Search with `rg -n PATTERN path/`, then read a window.
- Never cat or open: `web/app/globals.css` (rg only), `web/package-lock.json`, `*-sheet.json`, whole `web/lib/contexts/useGameLoop.ts` / `pocketbase/main.go`, anything in `.ignore` / `.cursorignore`.
- View `docs/art-reference-sm.jpg`, never `docs/art-reference.png`. One screenshot at a time.
- Run the single test file you touched; the full suite once, at the end.
- Noise paths: `.cursorignore`, `.ignore`, `.claude/settings.json`. Keep the three in sync.

## Map

| Feature | Web (`web/`) | Native (`native/`) |
|---|---|---|
| Shell / routing | `components/game/GameApp.tsx`, `GameScreenRouter.tsx`, `lib/game-screens.ts` | `App/RootView.swift`, `LandnamCore/.../Model/Screen.swift` |
| Base (hub) | `components/game/screens/HubScreen.tsx`, `components/game/hub/*` | `App/Screens/HubScreen.swift`, `BaseWorldScene.swift`, `BaseDock.swift`, `BaseCamera.swift` |
| Mining (laser) | `screens/MiningScreen.tsx`, `MiningCanvas.tsx`, `lib/mining/*`, `lib/engine/scripts/MiningController.ts`, `lib/systems/MiningSystem.ts` | `App/Scenes/MiningScene.swift`, `App/Mining/*`, `LandnamCore/.../Mining/*` |
| Mission flow | `MissionSetupRoutes.tsx`, `MissionOperationRoutes.tsx`, `lib/mission-flow.ts`, `lib/data/mission-generator.ts`, `lib/systems/MissionRunLifecycle.ts` | `App/Screens/CoreLoop.swift`, `FlightScreens.swift`, `LandnamCore/.../Systems/Loop.swift`, `MissionBoard.swift` |
| Hangar | `screens/HangarScreen.tsx`, `lib/data/shipCustomizer.ts`, `lib/rockets.ts` | `App/Screens/HangarScreen.swift`, `LandnamCore/.../Data/Rockets.swift` |
| Exchange (Market) | `screens/MarketScreen.tsx`, `lib/systems/EconomySystem.ts` | `LandnamCore/.../Systems/Market.swift`, `Data/Economy.swift` |
| Settings | `components/game/SettingsSheet.tsx` | `App/Screens/HubScreen.swift`, `App/OrientationPreference.swift` |
| Sync / state | `game-context.tsx`, `lib/game-state*.ts`, `lib/sync/*`, `lib/offline/*` | `LandnamCore/.../Sync/*`, `Store/GameStore.swift` |
| Backend | `lib/pb*.ts` | `pocketbase/` (Go hooks, `pb_migrations/`) |
| Design tokens | `app/globals.css` (rg only), `shared/tokens/tokens.json` -> `npm run sync:shared` | `App/Theme.swift` (`Theme.generated.swift` is generated) |
| Scene scripts, Studio | `shared/authoring/`, `app/game/studio/`, `lib/authoring/` | `AuthoredMissions.swift` + generated `AuthoredMissions.generated.swift` |

## Priority order (highest wins)
1. The user's latest instruction and latest approved specs.
2. The Linear `SSL-*` ticket: its scope and "Done when" list.
3. Design decisions in ZenNotes (`~/Navigation/workspace`, `projects/landnam/decisions/`, `decisions/`; search it first).
4. This file, then `docs/agents/`, then older `docs/` and `specs/`. Older docs are evidence, not instructions; report stale ones in the ticket.

## Standing rules (Liam, mandatory)
- Work on `cycle/4`, no feature branches, never push to `main`. No waiting on CI; report CI and deploys as unverified unless checked.
- Native must match web in behavior and look. Each slice: web, then native iOS and macOS, before the next feature. iPad is not a target. Record each destination checked or blocked.
- No scene titles ("Base", "Earth HQ", "Earth Base") anywhere in UI.
- One shared HUD on every screen (web `components/game/hub/` + `SyncStatus`, native `App/Screens/SharedHud.swift`).
- Every gameplay screen is a real scene with the action on an object in it; never a card grid or text-and-buttons page.
- No orange or green UI. Colours only from CSS variables / `shared/tokens`; never hand-edit generated files.
- Text at least 14px, tap targets at least 44px, 8pt rhythm. No emoji in UI. UPPERCASE tracked labels and CTAs. No em dashes in copy.
- Phone portrait, phone landscape and desktop must all work.
- When a redesign removes UI, build new theme-matching elements; never restore old ones.
- PocketBase is the only state store, through the outbox; no direct client writes. Offline-first; check phone sizes and Safari.
- No account-free play (no guest mode, demo routes). "Client", never "contractor".
- No TestFlight uploads; do not recreate that workflow without asking.
- Do not drive the user's device or desktop; test headless or in the iOS Simulator.
- Every screen and Hub state is reachable by URL (`/game/<screen>`, Hub query params) and listed in `scripts/preview-target.mjs`.

## Session and cost discipline (mandatory; measured 2026-10-24)
Logs showed 10.7B cache-read tokens against 37M output across 108 sessions, one session at 9,059 turns, and 17,856 Bash calls against 641 edits. Cost grows with every turn of a long session.
- One ticket per session. Start a fresh session for the next ticket; never chain tickets in one session.
- Stop and hand off at about 150 turns or when the ticket's "Done when" is met, whichever is first. Handoff goes in the Linear comment.
- No subagents for tickets under a day. No polling loops or Monitor for things that finish in under a minute.
- Tuning numbers (speed, size, count, zones) live in shared TOML/data, never hard-coded per platform. One value edit, no commit per nudge.
- Max 3 tickets In Progress at once. A ticket's commits must match its title; if the work changed, retitle or open a new ticket.
- Prove the changed screen only: one viewport it affects, plus native when native changed. The full 3-viewport matrix runs once per cycle release gate, not per ticket.
- Never start a foundation or spike ticket while the release gate (SSL-626) is open.

## Done means proof
Done needs the real code path, typecheck and relevant tests, and a screenshot you looked at of the changed screen in the viewport it affects (390x844, 926x428 or 1440x900; all three only at the cycle release gate). Unit tests alone never prove it works. Never claim a check you did not run; name what was skipped. Full contract: `docs/agents/testing.md`.

## Commit and Linear
- After a finished, verified unit only: `git status --short`, `git add .` (all changes, including other agents'; disclose any exclusion), review `git diff --cached`, commit, `git pull --rebase`, push to `cycle/4`. No WIP, checkpoint or one-line commits. Never `--no-verify`.
- Subject: `🚀🐺 ↝ [SSL-123 SSL-456]: Concise outcome`. Two different emoji (no flags, no faces), the exact `↝`, every ticket key in one bracket pair.
- Linear is the only tracker. Read the ticket and its latest comments first. Post the handoff (what changed, what was verified, what is left) with `save_comment` and set Done with `save_issue` when your checks pass; do not park it In Review.
