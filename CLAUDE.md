<!-- LANDNAM PROJECT REQUIREMENTS START -->
# Landnam — Agent Instructions

## Linear-first agent workflow

As of 2026-08-02, **Linear is the sole project-management system for Landnam**, superseding Desk for this project only (every other repo under `~/Navigation` still uses Desk — see the root `CLAUDE.md`). Landnam lives in Linear workspace team **Kestloome**, project **Landnam** (issues use the `KES-` prefix; Landnam does not have its own team/prefix yet — that's a known follow-up, not a bug). Before changing code, resolve the relevant Linear issue or create one with `save_issue`. During work, update it when scope, status, blockers, or decisions change — set `cycle`/`milestone` for sprint tracking (currently milestone-based: Sprint 9 and earlier, Sprint 10, Sprint 11, Sprint 12, Backlog/unscheduled). Before finishing, add implementation evidence via `save_comment`, move it to the correct status (Backlog/Todo/In Progress/In Review/Done), link related issues with `blockedBy`/`blocks`, and include the Linear issue ID (e.g. `KES-123`) in the commit subject or body. Never use Desk, Knowns, `.knowns`, Plate, or workspace ticket Markdown as a replacement for Linear issue state on this project. If no Linear ID exists, stop before committing and create or resolve the issue.

Historical Landnam tickets predating 2026-08-02 live in Desk, migrated into Linear under the `landnam-migration` label; Desk tickets were labeled `migrated-to-linear` rather than deleted. ZenNotes remains the source of truth for durable decisions/specs — Linear issues should reference it rather than duplicating detail.

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
Players manage a space program: build rockets, accept client jobs, fly to
targets, mine minerals, sell cargo, and reinvest. The active onboarding scope is
M1 and M2. M2 uses the newer Prospector purchase flow. M3 is not yet fully
described; do not revive earlier onboarding or post-onboarding plans.

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
- **Theme is split by surface type, not global.** Operations screens (Mining HUD, Transit, Debrief, live Mission Board contract list) use the dark command-deck theme (`.theme-deep`, the default). Reference/guide/market/menu-style surfaces (e.g. `ClientBonusGuideSheet`) use the light editorial theme (`.theme-light`) — background/surface/text go light, `--ln-cyan`/`--ln-amber` stay as accents. This is not a user-facing toggle. See `workspace/decisions/landnam-light-theme-for-reference-and-menu-surfaces.md` for full rationale. **Launchpad is a documented exception, not a violation**: STS-630 (decided 2026-07-31, ZenNotes `projects/landnam/decisions/landnam-scene-panel-background-direction-2026-07-31.md`) gave the Launchpad screen specifically a lit "scene panel" sky/ground background with white instrument cards (`.ln-scene-launchpad` in `globals.css`), superseding the flat dark-fill rule for that one screen only — do not "fix" it back to dark theme.
- **Full design language reference**: `workspace/projects/landnam/decisions/landnam-ui-design-language-style-prompt.md` (ZenNotes) is the canonical doc — complete `--ln-*` color token table, texture/rendering preferences (chunky cel-shaded faceted flat color, no grain/noise/scanline), game-style references (Crashlands, Tiny Space Program, Out There: Omega), and the component vocabulary. Read it before any visual/UI design work — this direction changed twice in three days (2026-07-22 → 2026-07-23), so don't trust a cached summary of it, including this one; check the doc and `web/app/globals.css`'s `:root` comment directly.
- **One dark-navy palette everywhere** (Mining, Transit, launch sequence, Mission Board, Target Picker, Rocket Purchase, Debrief all use `.theme-deep`) — an earlier mid-tone "steel/light-card" direction for Mission Board/Target Picker/Rocket Purchase (STS-494, decided 2026-07-22) was tried in code and **explicitly reverted 2026-07-23** for looking washed-out/illegible; don't reintroduce it. `.theme-light` (STS-413) remains separate, for reference/guide/market surfaces only.
- **Amber (`--ln-amber`) is restricted to genuine payout/reward emphasis in small elements only** — never a panel accent, headline, primary button, or generic UI chrome (sort controls, info panels, dismiss buttons). This rule survived both 2026-07-22 and 2026-07-23 revisions unchanged and was found actively violated in shipped Mission Board/Rocket Purchase code as of 2026-07-24 (fixed same day in `MissionBoardScreen.tsx`, `MissionCard.tsx`, `RocketPurchaseScreen.tsx` — default fallback accents and UI chrome switched from amber to cyan). A contractor's own data-defined brand color (e.g. Helios Propulsion `#f5a623`) is a separate, legitimate per-client-identity concern and is not covered by this rule.
- **Landnam reuses ordinary/real-world terms for unrelated screens — check the actual component before describing or prompting about a screen.** Confirmed collision: "Transit" means both `TransitScreen.tsx` (physical rocket flight — ship, ETA, Abort Mission; used for cargo runs AND the satellite's own launch to Earth orbit) and TESS transit-photometry / `TessDiscoveryScreen.tsx` (the satellite already in orbit performing a stationary scan — zero travel, zero ETA, an observatory console instead). Full glossary and the standing rule ("resolve the mechanic from the real component via `GameScreenRouter.tsx`, never from the screen's name alone; add any newly-found collision to the glossary in the same turn") are in the design-language doc below — this is not optional context, it directly caused a wrong design-tool prompt on 2026-07-24.

## Narrative & content rules

- No fictional wrapper on mainline citizen-science content: a player should never need lore or backstory to understand a mission — just "here's a project, here's a dataset." Real science, real terminology.
- Slight fictional framing (e.g. "potentially alien artifacts," mirroring real SETI false-positive workflows) is permitted only in the most speculative, latest-unlocked tier of content — never in early/mid-game missions.
- Decided 2026-07-08; see [[decide-scifi-narrative-vs-citizen-science-boundary]] in workspace for full context.
- **Crew have no citizen-science role — revisit only when user-supplied-data citizen science exists.** Standing reminder for every agent (Claude, Codex, OpenCode), decided 2026-07-28: astronauts and other crew must not be wired into classification, discovery, or any other citizen-science yield. Reopen the question only once citizen-science mechanics where *the player supplies their own data* are real. Crew visiting a target that was discovered through a citizen-science mission is ordinary mission work and is explicitly NOT an exception to this. See ZenNotes `projects/landnam/decisions/Astronaut academy — crew model.md`.

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
- M1 complete → Prospector is available as a purchasable prebuilt rocket model
- Prebuilt rocket models are single-use/unibody during onboarding (STS-604 retired "starter rocket" — see `web/lib/data/rockets.ts`)
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

As of 2026-07-18, **Desk (MCP server `desk`, registered globally — available in every repo, not just this one) is the live system of record for tickets, sprints, and board state.** Use its MCP tools directly (`projectId: "project-landnam"`):

- `list_tickets` / `get_ticket` / `list_story_boards` to read tickets, filtered by project/sprint/status.
- `create_ticket` / `update_ticket` to create tickets and change status, priority, sprint, epic, or labels.
- `add_comment` for implementation evidence — write it as a comment on the ticket instead of a markdown "Implementation Evidence" heading.
- `link_tickets` to relate or block tickets.

Status lifecycle: `Todo` → `In Progress` → `Done`. Desk trusts the status field directly rather than deriving it from anything else, so don't mark something `Done` with real work still outstanding — that's exactly the failure mode that made past sprints look complete when they weren't. **When Liam answers a question in chat, write it back to the relevant Desk ticket (as a comment or in the description) in the same turn** — an answer that only exists in conversation is not resolved.

**Plate is archived.** Do not create or update tasks there, and do not treat its state as authoritative.

**The old `workspace/projects/landnam/tickets/<sprint>/*.md` + `workspace_ticket.py` / `workspace_board.py` / `Current.md` system is retired.** Don't create new ticket files there, don't run those scripts to change ticket state, and don't treat `Current.md` as the operational board (it's archived). `workspace/projects/landnam/docs/` is unaffected — it remains the right place for long-form specs and decisions.

**Compass** (`/Applications/Compass.app`) previously read `~/Navigation/.knowns/`; that board is superseded by Desk for ticket state of record.

## Documentation & Decisions: Craft, Desk, ZenNotes

As of 2026-07-21, this supersedes the "`workspace/projects/landnam/docs/`... remains the right place for long-form specs and decisions" line above:

- **Craft** — long-form writing: planning docs, ideation, proposals, spec drafts, playtest/feedback triage write-ups, research notes. Every Craft doc tied to active Landnam work must be **tagged** and **attached to its Desk ticket(s)/story** (`attach_craft_doc`) — don't leave it floating with no ticket link.
- **ZenNotes** (`~/Navigation/workspace`, ZenNotes MCP) — canonical home for **decisions and rules**: finalized specs, mission definitions and their limits (e.g. what Mission 3 is and its constraints), gameplay/design decisions. This is what to search first for authoritative rules — not Craft, not ad-hoc Knowns docs. The "Standing product rules" and "Narrative & content rules" sections above are the kind of content that belongs here going forward.
- **Desk** — tickets/stories/epics only. A ticket references Craft (planning context) and ZenNotes (rules/decisions) rather than duplicating their content.

Flow: research/ideation in Craft → tag + attach to the Desk ticket once it needs review or action → once a decision lands, write the durable rule/spec into ZenNotes, not just a Craft doc or ticket comment.
