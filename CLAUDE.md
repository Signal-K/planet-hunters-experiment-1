<!-- LANDNAM PROJECT REQUIREMENTS START -->
# Landnam — Agent Instructions

> **Canonical guidance**: Read `KNOWNS.md` in the repository root for full workflow rules. This file covers Landnam-specific repo layout and conventions only.

## Knowns Project Root

Landnam does not own a live `.knowns` store. The canonical Knowns project is the parent Star Sailors workspace at `~/Navigation` (`/Users/scroobz/Navigation`), with live data in `~/Navigation/.knowns`.

If a Knowns MCP/tool call reports no project loaded, or setting the project to `~/Navigation/Landnam` fails because `Landnam/.knowns/config.json` does not exist, immediately connect to the parent project instead:

```json
mcp__knowns__project({ "action": "set", "projectRoot": "/Users/scroobz/Navigation" })
```

For CLI workflows, run `knowns ...` commands from `/Users/scroobz/Navigation` or otherwise target that parent repo. Do not create a separate live `.knowns` store inside `Landnam` unless explicitly instructed.

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

Landnam is a mining and resource-management game in the Star Sailors ecosystem.
Players manage a space program: build rockets, accept contractor jobs, fly to
targets, mine minerals, sell cargo, and reinvest. The active onboarding scope is
M1 and M2. M2 uses the newer SR2 purchase flow. M3 is not yet fully described;
do not revive earlier onboarding or post-onboarding plans.

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
- All views must support landscape/desktop mode — every screen must work at desktop breakpoints, not just mobile portrait
- 8pt spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64px only
- No emoji. Status = shape + color + label
- UPPERCASE + letter-spacing for all instrument labels and CTAs
- Hairlines: ghosted cyan at 18% alpha (`--ln-hairline`)

## Narrative & content rules

- No fictional wrapper on mainline citizen-science content: a player should never need lore or backstory to understand a mission — just "here's a project, here's a dataset." Real science, real terminology.
- Slight fictional framing (e.g. "potentially alien artifacts," mirroring real SETI false-positive workflows) is permitted only in the most speculative, latest-unlocked tier of content — never in early/mid-game missions.
- Decided 2026-07-08; see [[decide-scifi-narrative-vs-citizen-science-boundary]] in workspace for full context.

## Standing product rules

Durable rules pulled from sprint-planning discussion (Craft doc "Landnam sprint proposals"), not one-off sprint scope. These apply to every sprint and to every agent working in this repo (Claude, Codex, OpenCode) — treat them the same as the Design rules above: never violate without an explicit new decision.

- **Terminology: clients, not contractors.** "Contractor"/"subcontractor" naming is retired in-game. Use "client" for whoever issues a mission. Do not reintroduce "contractor" wording in new UI copy, survey copy, or code identifiers — this includes live PostHog survey definitions, not just local code (see the 2026-07-12 client-terminology sync in Saily/Landnam PostHog surveys).
- **Docker must never require network access.** `make up` and every container in `docker-compose.yml` must start and run fully offline. Never add a build/run step that fetches updates or external resources at container start; if a base image needs bumping, do that as an explicit, separate maintenance action, never as a side effect of a normal `make up`.
- **PostHog surveys must be live, real, and non-blocking.** Every survey ID referenced in code must resolve to a real, non-archived PostHog survey — no demo/dummy/placeholder IDs. Survey popups must never block or cover gameplay UI. Every sprint, audit answered-vs-ignored survey volume against the milestone events meant to trigger them (see the `per-sprint-survey-audit-process` ticket pattern for the checklist) — this is a standing process, not a one-off task.
- **Onboarding mission content mapping** — do not reorder without a new design decision:
  - Mission 1 — pick a mission, pick a target, build and send a rocket
  - Mission 2 — unlock a new, larger-capacity rocket; expose a mission-tier indicator to the player
  - Mission 3 — introduce clients requesting non-mineral cargo; payout is a service fee, not the cargo's raw value

## Backend connections

This project uses a hub-and-spoke PocketBase topology with three backends. For full detail, read @doc/backend-architecture in the parent Navigation Knowns.

**Shared backend** (auth + shared data — port 8090, `NEXT_PUBLIC_SHARED_PB_URL`):
- `lib/pb.ts` → `pbShared` connects here
- Collections: users plus shared platform data
- Auth: users register here, tokens verified by game backends via HTTP delegation

**Landnam backend** (game data — port 8091 Docker / 8093 dev, `NEXT_PUBLIC_LANDNAM_PB_URL`):
- `lib/pb-landnam.ts` → `pbLandnam` connects here
- Collections: game_states (user JSON), minerals, contractors, locations, rocket_parts, missions_catalog
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
- M1 complete → SR2 is available as a purchasable prebuilt starter rocket
- Starter rockets are single-use/unibody during onboarding
- Post-onboarding custom shipbuilding is not active until a new design is written

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
4. No Godot, no Electron. `.scene.json` files under `web/public/game/scenes/` ARE used — they describe entity layout/placement (shared `SceneData`/`EntityData` model in `web/lib/engine/types.ts`) for both PixiJS canvas screens and DOM screens, and are edited via Forge. See @doc/specs/landnam-screen-entityscene-dx-standard
5. Read KNOWNS docs for game design decisions before changing game logic
6. Use `appendNotes` in tasks (never `notes` for progress updates)
7. See "Standing product rules" above for terminology, Docker-offline, and PostHog-survey requirements — these bind every agent, not just Claude

<!-- LANDNAM PROJECT REQUIREMENTS END -->

## Tickets & Sprints

**Canonical source: `~/Navigation/workspace/` (ZenNotes-backed).** Knowns is being phased out for planning — do not create or edit `knowns task` entries for new Landnam work. Read `~/Navigation/CLAUDE.md` for the full workflow; the short version:

```bash
cd ~/Navigation
cat workspace/Current.md                                  # active board: what's active/in-review/blocked/next
python3 scripts/workspace_board.py                         # regenerate board after any frontmatter change
python3 scripts/workspace_ticket.py list --project landnam --sprint <active-sprint-slug>
python3 scripts/workspace_ticket.py show <ticket-id-or-slug>
python3 scripts/workspace_ticket.py update <ticket-id-or-slug> --status in-review --heading "Implementation Evidence" --note "..."
```

Tickets live at `workspace/projects/landnam/tickets/<sprint>/*.md`, specs/docs at `workspace/projects/landnam/docs/`.

**Sprint label format: `sprint-YYYY-MM-DD`** where the date is the Saturday ending the sprint (never numbered sprints like `sprint-6`). Sprint frontmatter must match a `workspace/sprints/<slug>/README.md` with `status: active` — check this fresh each session, there can be more than one active sprint across projects.

Status lifecycle: `todo` → `in-progress` → `in-review` (only Liam marks `done`).

Open decisions needing Liam's input go in a `status: blocked` ticket, each question formatted as `**N. Question text` (no closing `**`) followed by a blank `> Answer:` line — `workspace_board.py` surfaces these under "Open Questions" in `Current.md`. **When Liam answers a question in chat, write the `> Answer:` line back into the ticket in the same turn** — an answer that only exists in conversation is not resolved, and leaving it unwritten is exactly what causes "I already answered this" complaints.

**Compass** (`/Applications/Compass.app`) reads `~/Navigation/.knowns/` for its board, but ticket state of record is the workspace ticket files above — Compass reflects them, it does not own them.

To find the current sprint Saturday: run `date +%Y-%m-%d` and count to the nearest Saturday.
