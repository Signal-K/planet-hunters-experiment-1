# Agent workflow

Part of the Landnam agent instructions; `AGENTS.md` (repo root) is the entry point and wins on conflict. Read when starting a task.

## Process (Liam, standing, mandatory)

1. Commits: commit ALL files with changes, in one commit, and only after real work (a finished, coherent unit: feature, fix, ticket). No tiny or frequent commits, no WIP, checkpoint, CI-poke or one-line churn commits. See "Commit" below for the format.
2. Branching: work directly on `cycle/4`. No feature branches. Never push to `main` directly; the release path is a PR from `cycle/4` into `main` (CI required must pass), and the merge deploys the web Worker (no TestFlight upload).
3. No waiting on CI. CI runs typecheck, unit tests, build and Playwright scenes. Run relevant local checks to completion; do not poll CI or block delivery on its queue. Report CI and deployment as unverified unless actually checked.
4. Done means proof: nothing is "done" without a viewed screenshot of the running build. Every ticket carries a "Done when" line. Close your own Linear tickets. When the fix is on `cycle/4` and your own checks pass (typecheck, the relevant tests, and screenshots you have looked at), mark the ticket Done with a short comment giving the commit and the proof. Do not leave it In Review waiting for real Safari or any check you cannot run; say in the comment what was not run.
5. Keep discovery bounded: read the active ticket, its latest comments, applicable decisions and the real implementation. Do not scan historical docs or repeat passed checks without a changed input or unresolved failure.

## Platforms
14. Native must match web behavior and appearance. For EACH acceptance slice, implement web, then native iOS and macOS before starting another feature (iPad is not a target). Compare the same state side by side. Shared SwiftUI code does not prove every destination works; explicitly record each destination checked or blocked.

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

## Workflow

- Linear `SSL-*` (Landnam team) is the only tracker. Read the ticket first; its scope and "Done when" line define the task. Move status as work progresses. When the fix is on `cycle/4` and typecheck, the relevant tests, and the screenshots you looked at all pass, set the ticket Done yourself and comment the commit plus the proof. Do not park it In Review for Safari or any check you cannot run; name what was skipped in the comment. Put new work, blockers and handoffs (what changed, what was verified, what is left) in Linear, not in repo files.
- Decisions: research in Craft, tracking in Linear, durable decisions and rules in ZenNotes (search ZenNotes first). Landnam has no local decision store.
- Verify claims about existing state yourself (stashes, "pre-existing changes", ticket status that says In Review but has no code). Check `.github/workflows/*.yml` before removing dependencies.

## Commit

- One commit per finished unit of work, after real work only, staging ALL task changes (`git add .`; nothing left uncommitted, exclude only clearly unrelated work, secrets or generated output, and disclose exclusions). Inspect `git status --short` and `git diff --cached` first.
- Subject: `🚀🐺 ↝ [SSL-123 SSL-456]: Concise outcome`. Two different emoji (no flags, no smiley or human faces), the exact `↝` arrow and spacing, every worked ticket key in one bracket pair separated by spaces. Never use `--no-verify`.
- Then `git pull --rebase` and push to `cycle/4`. Post the handoff with the Linear MCP (`save_comment`) and set the status to Done (`save_issue`) when your own checks pass. Do not leave the ticket In Review.
- Landnam is a web app game and a native SwiftUI game. Nothing else; no Godot.

## Full repo map

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
