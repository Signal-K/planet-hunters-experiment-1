# AGENTS (canonical, Landnam)

This is the single source of agent instructions for the Landnam repo. `CLAUDE.md` carries identical content (keep the two files in sync); `web/AGENTS.md` and `web/CLAUDE.md` are thin pointers. Do not copy rules into other files.

## Rules of the game (Liam, standing, mandatory)

Process
1. Commits: commit ALL files with changes, in one commit, and only after real work (a finished, coherent unit: feature, fix, ticket). No tiny or frequent commits, no WIP, checkpoint, CI-poke or one-line churn commits. See "Commit" below for the format.
2. Branching: work directly on `cycle/4`. No feature branches, no PRs. Never push to `main`.
3. No waiting on CI. CI is typecheck, unit tests and build only. Do not poll or block on it.
4. Done means proof: nothing is "done" without a viewed screenshot of the running build. Every ticket carries a "Done when" line.
5. Compact sessions at about 150k tokens. Start new sessions at medium effort.

Names and surfaces
6. Never show scene titles ("Base", "Earth HQ", "Earth Base") anywhere, web or native. They are internal names only.
7. Mining default is ship mining with the laser, exactly as in the webapp. Laser mining is canonical. Rover/Takeon is a separate surface mode and never hijacks laser mining.
8. The dock is exactly three controls: `« »`, Build, Hub. Base-only features (for example Subsurface) are opened from the base scene, not the dock.
9. Exchange (Market) stays a real building on the base, not a menu item.

Base scene
10. No planet in the base sky. No people walking at this stage.
11. Backgrounds and scenes are modular, tileable layers, never a single whole-scene image. Everything is animated.
12. Base kit direction is the approved `base-kit-v6`: angular and modular, about 40% No Man's Sky, white panelled hulls, blue/orange trim (less orange), silos underground only, a bird's-eye toggle, an industrial and natural mix ground.
13. Palette is the deep dusk palette in `docs/design/game-theme-spec.md` (section 2). No flat constant colour.

Platforms
14. Native must match the web look. Compare web and native side by side with screenshots before saying done.

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
- All colors from CSS variables in `web/app/globals.css`; no hardcoded hex. Read `projects/landnam/decisions/landnam-ui-design-language-style-prompt.md` and the `:root` comment in `globals.css` before visual work, since direction has changed several times.
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
2. Type-check and relevant tests pass (`test:scenes` for anything visual or flow-related; `test:unit` for logic).
3. Rendered-play proof: screenshots of the affected screen(s) at **390x844** (phone portrait), **926x428** (phone landscape) and **1440x900** (desktop). Verify the real viewport (`innerWidth`/`matchMedia`), since a window resize can silently no-op. Look at the screenshots for overlap, clipping, text under 14px, targets under 44px, and wrong colors.
4. Unit tests alone never justify Done or "works". A green suite says nothing about whether the game plays.
5. Never claim a check passed that you did not run. State what ran, what was skipped, and why. Heavy pipelines (20+ minute e2e) are not run per iteration: iterate with targeted local checks and push batched.
6. Do not drive the user's own device or desktop (no osascript clicks, desktop captures, or launching windows). Test headless or in the iOS Simulator.

## Workflow

- Linear `SSL-*` (Landnam team) is the only tracker. Read the ticket first; its scope and "Done when" line define the task. Move status as work progresses; set Done only when the "Done when" item is verified with a viewed screenshot. Put new work, blockers and handoffs (what changed, what was verified, what is left) in Linear, not in repo files.
- Decisions: research in Craft, tracking in Linear, durable decisions and rules in ZenNotes (search ZenNotes first). Landnam has no local decision store.
- Verify claims about existing state yourself (stashes, "pre-existing changes", ticket status that says In Review but has no code). Check `.github/workflows/*.yml` before removing dependencies.

## Commit

- One commit per finished unit of work, after real work only, staging ALL changes (`git add -A`; nothing left uncommitted, exclude only clearly unrelated work, secrets or generated output, and disclose exclusions). Inspect `git status --short` and `git diff --cached` first.
- Subject: `🚀🐺 ↝ [SSL-123 SSL-456]: Concise outcome`. Two different emoji (no flags, no smiley or human faces), the exact `↝` arrow and spacing, every worked ticket key in one bracket pair separated by spaces. Never use `--no-verify`.
- Then `git pull --rebase` and push to `cycle/4`. Post the handoff with the Linear MCP (`save_comment`) and set the status (`save_issue`).
- Landnam is a web app game and a native SwiftUI game. Nothing else; no Godot.
