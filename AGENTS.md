# AGENTS (canonical, Landnam)

This is the single source of agent instructions for the Landnam repo. `CLAUDE.md`, `web/AGENTS.md` and `web/CLAUDE.md` are thin pointers. Do not copy rules into other files; edit this one.

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

- Light blueprint style. No dark mode, no dark-by-default surface (operations screens included), no orange or purple hue. Amber only for tiny payout/reward emphasis.
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

- Linear `SSL-*` (Landnam team) is the only tracker. Read the ticket first; its scope and "Done when" define the task. Move status as work progresses; set Done only when the "Done when" items are verified. Put new work, blockers and handoffs (what changed, what was verified, what is left) in Linear, not in repo files. Tag tickets with the current cycle milestone.
- Branching: integration branch `cycle/<N>` off `main`; all work lands there; one Friday PR `cycle/<N>` to `main`; Saturday review. Never push to `main` mid-week.
- Decisions: research in Craft, tracking in Linear, durable decisions and rules in ZenNotes (search ZenNotes first). Landnam has no local decision store.
- Verify claims about existing state yourself (stashes, "pre-existing changes", ticket status that says In Review but has no code). Check `.github/workflows/*.yml` before removing dependencies.

## Commit policy (Navigation-wide)

- Commit only after a coherent, verified ticket outcome. No checkpoint, progress, one-file or speculative commits. A coding request authorizes the final commit unless the user says not to.
- From the repo root: inspect `git status --short`, run checks, `git add .`, review `git diff --cached` and `git status --short`. Exclude only clearly unrelated work, secrets or generated output, and disclose exclusions.
- Subject: `🚀🐺 ↝ [SSL-123 SSL-456]: Concise outcome`. Two different emoji (no flags, no smiley or human faces), the exact `↝` arrow and spacing, every worked ticket key in one bracket pair separated by spaces. Never use `--no-verify`.
