<!-- LANDNAM PROJECT REQUIREMENTS START -->
# Landnam Project Requirements

## Repo Location

```
~/Navigation/Landnam/          ← this repo (Landnam monorepo)
~/Navigation/Landnam/scene/    ← Godot project (DO NOT TOUCH — ever)
~/Navigation/Landnam/backend/  ← Landnam PocketBase, port 8091
~/Navigation/Landnam/web/      ← Next.js frontend (create this)
~/Navigation/backend/          ← shared PocketBase, port 8090
```

Working directory for all frontend work is `~/Navigation/Landnam/web/` — create this folder first.
Do not touch anything in `~/Navigation/Landnam/scene/` or `~/Navigation/Landnam/backend/` unless explicitly told to.

- All `npm` commands run from `~/Navigation/Landnam/web/`
- All git commits are made from `~/Navigation/Landnam/` (the monorepo root, so Godot + backend + web are in one repo with a clean history).

---

# Landnam Frontend — Claude Code Working Document

## What this project is

Landnam is a citizen science mining game in the Star Sailors ecosystem.
Players manage a space program: build rockets, accept contractor jobs,
fly to asteroids, mine minerals, classify TESS lightcurve data, sell
cargo, and reinvest. The UI is a space agency management interface —
NASA mission control mixed with a tabletop wargame aesthetic.

This repo is the React/Next.js frontend that replaces the Godot UI
layer. The Godot project still exists for the mining minigame only
(embedded as a WebGL canvas). Everything else is React.

## Repo location

```
~/Navigation/Landnam-Web/     ← this repo
~/Navigation/Landnam/scene/   ← Godot project (DO NOT TOUCH — ever)
~/Navigation/backend/         ← shared PocketBase, port 8090
~/Navigation/Landnam/backend/ ← Landnam PocketBase, port 8091
```

## Tech stack

- Next.js 15 (App Router)
- TypeScript (strict mode — no `any`, no suppressed errors)
- Tailwind CSS v4
- Framer Motion for animations
- PocketBase JS SDK for API calls
- Tauri v2 for native app wrapping (config exists, don't break it)

## Design system

The design system lives in the zip that was used to bootstrap this
project. The canonical tokens are already in:
```
src/styles/tokens.css      ← mirrors colors_and_type.css exactly
src/styles/globals.css     ← imports tokens, sets base styles
```

The two visual modes are:
- `.theme-deep`  (default) — dark navy command deck
- `.theme-atlas`            — black parchment atlas/map screens

Fonts: Oxanium (display/body) + Turret Road (mono/atlas).
Both are in `public/fonts/` and declared in `tokens.css`.

Design rules (never violate these):
- Always landscape canvas. No portrait layouts.
- 8pt spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64px only.
- No bounces/springs except mission debrief reward reveals.
- No emoji anywhere. Status = shape + color + label.
- UPPERCASE + letter-spacing for all instrument labels and CTAs.
- Title Case for screen titles.
- Sentence case for body/dialog.
- Hairlines are ghosted cyan at 18% alpha (`--ln-hairline`), never solid neutral borders.
- Bottom action bar is sacred and fixed on every operations screen.

## Backend connections

Shared backend (auth + citizen science):
- `http://localhost:8090` (dev)
- `NEXT_PUBLIC_SHARED_PB_URL` env var (prod)
- Collections: users, celestial_bodies, classifications

Landnam backend (game data):
- `http://localhost:8091` (dev)
- `NEXT_PUBLIC_LANDNAM_PB_URL` env var (prod)
- Collections: contractors, locations, deposits, structures, rockets, missions, inventory, market_prices, research

Auth: user signs in via shared backend, gets JWT, stored in
`localStorage` as `'pb_auth_token'`. All Landnam backend requests
include this token in the `Authorization` header.

Cross-instance references: Landnam records reference shared backend
records by plain string ID in fields named `shared_body_id`,
`shared_classification_id` etc. Never try to join across backends.

## Screen inventory

Every screen the app needs — implement all of these:

### Hub (Earth Base)
Route: `/`
Theme: `.theme-deep`
Layout: full-bleed backdrop (`earth-day.png` or `earth-dusk.png` based
on local time), three interactive structure buildings (Satellite
Station, Launchpad, Control Station), bottom RadialNav, HUD chips
top-left (`EARTH BASE · LV {level}`) and top-right (francs, jobs),
ProgressionCard contextual below title.

### Launch Wizard
Route: `/launch`
Theme: `.theme-deep`
Layout: step-based flow. Steps: pick contractor → pick target
(celestial body) → assemble rocket (three-slot card picker:
chassis, propulsion, mining drill) → confirm launch. Bottom action
bar with progress indicator and primary CTA. Back nav top-left.

### Space Map / Atlas
Route: `/atlas`
Theme: `.theme-atlas`
Layout: concentric orbit rings (SVG), planet glyph chips, bottom
telemetry rail. Clickable bodies open a detail panel. Filter by
`body_type` and `classification_status`.

### Mission Active
Route: `/mission/[id]`
Theme: `.theme-deep`
Layout: mission status card (target, contractor, rocket, ETA
countdown), cargo manifest, abort button. When status = `'returning'`,
show return ETA.

### Mining (Godot embed)
Route: `/mine/[missionId]`
Theme: none (full canvas)
Layout: full-bleed iframe/canvas containing the Godot WebGL export.
Overlay: thin top HUD bar showing cargo remaining and a RETURN HOME
button. The Godot game posts messages to the parent window via
`postMessage` when cargo is filled or player requests return.

### Classification
Route: `/classify/[bodyId]`
Theme: `.theme-deep`
Layout: lightcurve plot (Line chart using Recharts or D3 — plot
flux vs time data from `configuration.lightcurve_data` on the
`celestial_body` record), classification buttons (PLANET /
NOT PLANET / ECLIPSING BINARY / UNCERTAIN), confidence slider,
submit button. On submit, POST to shared backend `classifications`
collection. On success, show confirmation and navigate back.

### Mission Debrief
Route: `/debrief/[missionId]`
Theme: `.theme-deep`
Layout: mission outcome card, cargo sold breakdown per mineral
(mineral color chips), francs earned (large amber display type,
single overshoot animation on mount), contractor affinity change,
next mission CTA.

### Market
Route: `/market`
Theme: `.theme-deep`
Layout: commodity price table (`market_prices` collection),
sparkline trend per commodity (fake trend, random walk seeded
from commodity name), buy/sell not yet implemented — show
prices and a COMING SOON chip.

### Contractors
Route: `/contractors`
Theme: `.theme-deep`
Layout: card list of contractors, each showing name, wanted
commodity (mineral chip), price per unit, contract terms.
Tapping a card starts the launch wizard pre-filled with that
contractor.

### Research
Route: `/research`
Theme: `.theme-deep`
Layout: tech tree grid. Three columns: rockets, equipment,
infrastructure. Each node shows locked/unlocked state. Locked
nodes show requirement (level or prerequisite tech). No unlock
mechanic yet — display only.

### Auth
Route: `/auth`
Theme: `.theme-deep`
Layout: centered card. Email + password fields. Sign in / create
account toggle. On success, store token and redirect to `/`.

## Component library to build

These components are used across multiple screens — build them
first as they unblock everything else:

### Primitives
- `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg">`
- `<Chip variant="status|mineral|currency|label">`
- `<HairlineCard>` — panel with ghosted cyan border + shadow
- `<StatusDot color="ok|warn|crit|info">`
- `<TelemetryRow label="..." value="..." unit="...">`
- `<SectionEyebrow>` — uppercase tracked label
- `<BottomBar>` — fixed bottom, left status segments + right CTA

### Composite
- `<MineralChip mineral="iron|silicon|gold|platinum|titanium|rare">`
- `<RocketSlotCard slot="chassis|propulsion|drill" selected={bool}>`
- `<CelestialBodyCard body={...}>` — used in atlas + launch wizard
- `<MissionStatusCard mission={...}>`
- `<ContractorCard contractor={...}>`
- `<ProgressionCard>` — contextual next-action card on hub
- `<RadialNav>` — hub bottom nav, fans 4 buttons on tap
- `<LightcurvePlot data={...}>` — flux vs time chart

### Hooks
- `usePocketBase(collection, query)` — fetches from correct backend
- `useAuth()` — current user, sign in, sign out
- `useMissions()` — active missions with polling
- `useMarketPrices()` — market_prices with 60s polling

## File structure to produce

```
src/
  app/
    layout.tsx          ← root layout, font loading, theme class
    page.tsx            ← Hub (Earth Base)
    auth/page.tsx
    launch/page.tsx
    atlas/page.tsx
    mission/[id]/page.tsx
    mine/[missionId]/page.tsx
    classify/[bodyId]/page.tsx
    debrief/[missionId]/page.tsx
    market/page.tsx
    contractors/page.tsx
    research/page.tsx
  components/
    primitives/         ← Button, Chip, HairlineCard, etc.
    composite/          ← MineralChip, SlotCard, etc.
    layout/             ← BottomBar, RadialNav, HUD chips
  hooks/
    usePocketBase.ts
    useAuth.ts
    useMissions.ts
    useMarketPrices.ts
  lib/
    pb-shared.ts        ← PocketBase client for shared backend
    pb-landnam.ts       ← PocketBase client for Landnam backend
    types.ts            ← TypeScript types for all collections
  styles/
    tokens.css
    globals.css
```

## Rules

1. TypeScript strict mode. No `any`. No `@ts-ignore`.
2. Every component gets a `.tsx` file. No logic in page files beyond data fetching and layout composition.
3. All colors from CSS variables (`--ln-*`). No hardcoded hex values.
4. All spacing from the 8pt rhythm. No arbitrary px values.
5. Framer Motion for all transitions. Duration tokens from `tokens.css`: quick 120ms, base 220ms, slow 420ms.
6. Mobile landscape minimum. Nothing below 768px wide.
7. No `console.log` left in committed code.
8. Run `npm run build` and `npm run typecheck` at the end. Both must pass with zero errors.
9. Do not create or modify anything outside this repo directory.
10. The Godot embed (`/mine/[missionId]`) is a placeholder iframe pointing at a local Godot export path. Don't try to build the Godot project.
11. All `npm` commands run from `~/Navigation/Landnam/web/`. All git commits from `~/Navigation/Landnam/`.

## Design system source files

Read these before writing any UI code:
```
~/Navigation/Landnam_Design_System/colors_and_type.css              ← all CSS tokens
~/Navigation/Landnam_Design_System/ui_kits/landnam-game/Chrome.jsx  ← BottomBar, TopBar, Button
~/Navigation/Landnam_Design_System/ui_kits/landnam-portrait/screens-pre.jsx  ← Hub, Launch, Debrief
~/Navigation/Landnam_Design_System/ui_kits/landnam-portrait/screens-loop.jsx ← Mining, Mission
~/Navigation/Landnam_Design_System/ui_kits/landnam-portrait/chrome.jsx       ← RadialNav, HUD chips
~/Navigation/Landnam_Design_System/ui_kits/landnam-portrait/tutorial.jsx     ← ProgressionCard, overlays
```

These JSX files are the visual source of truth. Translate them to TypeScript React components that match pixel-for-pixel.

## Task order

### Phase 1 — Project bootstrap
- Init Next.js 15 with TypeScript strict, Tailwind v4, App Router
- Install: pocketbase, framer-motion, recharts, lucide-react
- Copy `tokens.css` from the design system, wire into `globals.css`
- Copy fonts from design system to `public/fonts/`
- Create `src/lib/pb-shared.ts` and `src/lib/pb-landnam.ts`
- Create `src/lib/types.ts` with TypeScript types for all collections
- Create `src/hooks/useAuth.ts`, `usePocketBase.ts`, `useMissions.ts`, `useMarketPrices.ts`

### Phase 2 — Primitive components
Build every component in `src/components/primitives/`.

### Phase 3 — Composite components
Build every component in `src/components/composite/` and `src/components/layout/`.

### Phase 4 — Screens (in order)
1. `/auth`
2. `/` (Hub)
3. `/atlas`
4. `/contractors`
5. `/launch`
6. `/mission/[id]`
7. `/classify/[bodyId]`
8. `/debrief/[missionId]`
9. `/market`
10. `/research`
11. `/mine/[missionId]`

### Phase 5 — Polish and verify
- Ensure all screens use BottomBar and correct theme class
- Check all CSS variables are from `tokens.css`, no hardcoded hex
- Add Framer Motion transitions (fade + 8px slide up, 220ms ease-out)
- Run: `npm run typecheck` → `npm run build` → `npm run lint`
- Fix all errors. Warnings are acceptable.

## Definition of done

- All routes render without runtime errors.
- `npm run build` exits 0.
- `npm run typecheck` exits 0.
- `npm run lint` exits 0 or warnings only.
- Auth flow works against local PocketBase (`localhost:8090`).
- Hub screen renders with design system tokens visually correct.

---

## Godot Scene Authoring Is Scene-First

GDScript files are for functionality. They must not be used as a substitute for authoring scenes.

This is a hard project rule for every agent. If a UI element, screen, card, button, label, panel, structure marker, tutorial card, menu, or layout block is known at design time, it must exist as an editor-visible node in a `.tscn` file. Implementing a Claude/Stitch/design-template screen by generating its visible controls in GDScript is not acceptable.

When creating or changing a Godot scene, put the scene structure in the `.tscn` file: nodes, containers, labels, buttons, text content, layout, anchors, exported resources, and editor-visible defaults belong in the scene so it can be viewed and edited in the Godot editor.

Do not create an empty `.tscn` with a root node and then build the visible UI in `_ready()` or helper methods. That pattern is prohibited for static or known UI because it makes scenes unreadable, uneditable, and bug-prone.

Use `.gd` scripts only for behavior: signal handlers, state changes, data loading, validation, navigation, animation triggers, and binding runtime data into existing scene nodes. Runtime node creation is acceptable only for genuinely dynamic repeated content, such as rendering an arbitrary number of rows from player data, and must use preauthored child scenes/resources when practical.

Before finishing any task that creates or changes a scene, verify the `.tscn` contains the meaningful node tree, static UI/text, layout, and asset references, and that the attached script is not constructing that static UI in code. If the scene editor would not show the relevant UI before the game is run, the task is not complete.

## UI Blocks Need Dedicated Layout Segments

Every persistent UI block/component type must have a defined layout segment before it is placed on screen. Use `UILayout.gd` zones or scene-owned container lanes for headers, content, footers, overlays, tutorial cards, modals, action bars, widgets, and repeated panels. Do not float cards, tutorial panels, debug widgets, or action controls over arbitrary content without reserving space for them.

When adding a new overlay or persistent panel, define how it coexists with the rest of the screen at desktop, tablet, and mobile widths. If the tutorial coach or another overlay is visible, the underlying screen must either reserve a sidecar/body segment for it or explicitly suspend/hide the conflicting UI. Before finishing UI work, verify the relevant blocks do not overlap actionable content.

## Testing Must Leave Fresh Player State

When testing or playing the Godot game, use an isolated test profile whenever possible: the Docker sandbox, a temporary `GODOT_USER_DIR`, or Godot's `--user-data-dir` pointing at a disposable directory. Do not run test playthroughs against the user's normal playable save unless the user explicitly asks for that.

After any test run, manual play session, scripted playthrough, or change that touches saved game behavior, leave the game in a fresh-start state for the user. Fresh means the next normal play session starts from the beginning with the default 10,000,000,000 franc balance, no completed/active/returned missions, default rocket state, default construction/tutorial/first-time mechanic state, and no stale `user://` progress files from the test.

Prefer the existing reset paths when cleanup is needed: `AppController.full_factory_reset()` for in-game reset behavior and `AppControllerPersistence.reset_all()` or an isolated user-data directory for persisted files. Before finishing, verify the reset or state isolation when practical. If it cannot be verified, say that clearly.

## Production Exports Must Be Fresh

Any production export, deploy, release, or versioned build must be generated from the current `scene/` source. If Godot scene files, scripts, or exported assets changed, rebuild the web export before shipping by using the existing export pipeline, and run the export freshness verification when available. Do not publish stale `game/` or `electron-dist/godot-web` output after changing the Godot project.

<!-- LANDNAM PROJECT REQUIREMENTS END -->

<!-- KNOWNS GUIDELINES START -->
# Core Rules

> These rules are NON-NEGOTIABLE. Violating them leads to data corruption and lost work.

---

## The Golden Rule

**If you want to change ANYTHING in a task or doc, use CLI commands. NEVER edit .md files directly.**


---

## CRITICAL: The -a Flag Confusion

The `-a` flag means DIFFERENT things in different commands:

| Command | `-a` Means | NOT This! |
|---------|------------|-----------|
| `task create` | `--assignee` (assign user) | ~~acceptance criteria~~ |
| `task edit` | `--assignee` (assign user) | ~~acceptance criteria~~ |
| `doc edit` | `--append` (append content) | ~~assignee~~ |

### Acceptance Criteria: Use --ac

```bash
# WRONG: -a is assignee, NOT acceptance criteria!
knowns task edit 35 -a "- [ ] Criterion"    # Sets assignee to garbage!

# CORRECT: Use --ac for acceptance criteria
knowns task edit 35 --ac "Criterion one"
knowns task create "Title" --ac "Criterion one" --ac "Criterion two"
```

---

## Quick Reference

| Rule | Description |
|------|-------------|
| **CLI Only** | Use commands for ALL operations. NEVER edit .md files directly |
| **Docs First** | Read project docs BEFORE planning or coding |
| **Time Tracking** | Start timer when taking task, stop when done |
| **Plan Approval** | Share plan with user, WAIT for approval before coding |
| **Check AC After** | Only mark criteria done AFTER completing work |
| **Validate** | Run validate before completing task |

---

## The --plain Flag

**ONLY for view/list/search commands (NOT create/edit):**

```bash
# CORRECT
knowns task <id> --plain
knowns task list --plain
knowns doc "path" --plain
knowns search "query" --plain

# WRONG (create/edit don't support --plain)
knowns task create "Title" --plain       # ERROR!
knowns task edit <id> -s done --plain    # ERROR!
```

---

## Reference System

Tasks, docs, and templates can reference each other:

| Type | Writing (Input) | Reading (Output) |
|------|-----------------|------------------|
| Task | `@task-<id>` | `@.knowns/tasks/task-<id>` |
| Doc | `@doc/<path>` | `@.knowns/docs/<path>.md` |
| Template | `@template/<name>` | `@.knowns/templates/<name>` |

**Always follow refs recursively** to gather complete context before planning.

---

## Subtasks

### CLI
```bash
knowns task create "Subtask title" --parent 48
```

**CRITICAL:** Use raw ID for `--parent`:
```bash
# CORRECT
knowns task create "Title" --parent 48

# WRONG
knowns task create "Title" --parent task-48
```

---

# Context Optimization

Optimize your context usage to work more efficiently within token limits.

---

## Output Format

```bash
# Verbose output
knowns task 42 --json

# Compact output (always use --plain)
knowns task 42 --plain
```

---

## Search Before Read

### CLI
```bash
# DON'T: Read all docs hoping to find info
knowns doc "doc1" --plain
knowns doc "doc2" --plain

# DO: Search first, then read only relevant docs
knowns search "authentication" --type doc --plain
knowns doc "security-patterns" --plain
```

---


## Reading Documents

### CLI
**ALWAYS use `--smart`** - auto-handles both small and large docs:

```bash
# DON'T: Read without --smart
knowns doc readme --plain

# DO: Always use --smart
knowns doc readme --plain --smart
# Small doc → full content
# Large doc → stats + TOC

# If large, read specific section:
knowns doc readme --plain --section 3
```

**Behavior:**
- **≤2000 tokens**: Returns full content automatically
- **>2000 tokens**: Returns stats + TOC, then use section parameter

---

## Compact Notes

```bash
# DON'T: Verbose notes
knowns task edit 42 --append-notes "I have successfully completed the implementation..."

# DO: Compact notes
knowns task edit 42 --append-notes "Done: Auth middleware + JWT validation"
```

---

## Avoid Redundant Operations

| Don't | Do Instead |
|-------|------------|
| Re-read files already in context | Reference from memory |
| List tasks/docs multiple times | List once, remember results |
| Quote entire file contents | Summarize key points |

---

## Efficient Workflow

| Phase | Context-Efficient Approach |
|-------|---------------------------|
| **Research** | Search → Read only matches |
| **Planning** | Brief plan, not detailed prose |
| **Coding** | Read only files being modified |
| **Notes** | Bullet points, not paragraphs |
| **Completion** | Summary, not full log |

---

## Quick Rules

1. **Always `--plain`** - Never use `--json` unless needed
2. **Always `--smart`** - Auto-handles doc size
3. **Search first** - Don't read all docs hoping to find info
4. **Read selectively** - Only fetch what you need
5. **Write concise** - Compact notes, not essays
6. **Don't repeat** - Reference context already loaded

---

# CLI Commands Reference

## task create

```bash
knowns task create <title> [options]
```

| Flag | Short | Purpose |
|------|-------|---------|
| `--description` | `-d` | Task description |
| `--ac` | | Acceptance criterion (repeatable) |
| `--labels` | `-l` | Comma-separated labels |
| `--assignee` | `-a` | Assign to user |
| `--priority` | | low/medium/high |
| `--parent` | | Parent task ID (raw ID only!) |

**`-a` = assignee, NOT acceptance criteria! Use `--ac` for AC.**

---

## task edit

```bash
knowns task edit <id> [options]
```

| Flag | Short | Purpose |
|------|-------|---------|
| `--status` | `-s` | Change status |
| `--assignee` | `-a` | Assign user |
| `--ac` | | Add acceptance criterion |
| `--check-ac` | | Mark AC done (1-indexed) |
| `--uncheck-ac` | | Unmark AC |
| `--plan` | | Set implementation plan |
| `--notes` | | Replace notes |
| `--append-notes` | | Add to notes |

---

## task view/list

```bash
knowns task <id> --plain
knowns task list --plain
knowns task list --status in-progress --plain
knowns task list --tree --plain
```

---

## doc create

```bash
knowns doc create <title> [options]
```

| Flag | Short | Purpose |
|------|-------|---------|
| `--description` | `-d` | Description |
| `--tags` | `-t` | Comma-separated tags |
| `--folder` | `-f` | Folder path |

---

## doc edit

```bash
knowns doc edit <name> [options]
```

| Flag | Short | Purpose |
|------|-------|---------|
| `--content` | `-c` | Replace content |
| `--append` | `-a` | Append content |
| `--section` | | Target section (use with -c) |

**In doc edit, `-a` = append content, NOT assignee!**

---

## doc view/list

**ALWAYS use `--smart`** - auto-handles small/large docs:

```bash
knowns doc <path> --plain --smart
```

If large, returns TOC. Then read section:
```bash
knowns doc <path> --plain --section 3
```

```bash
knowns doc list --plain
knowns doc list --tag api --plain
```

---

## time

```bash
knowns time start <id>    # REQUIRED when taking task
knowns time stop          # REQUIRED when completing
knowns time status
knowns time add <id> <duration> -n "Note"
```

---

## search

```bash
knowns search "query" --plain
knowns search "auth" --type task --plain
knowns search "api" --type doc --plain
```

---

## template

```bash
knowns template list
knowns template info <name>
knowns template run <name> --name "X" --dry-run
knowns template create <name>
```

---

## Multi-line Input

```bash
knowns task edit <id> --plan $'1. Step\n2. Step\n3. Step'
```

---

# Task Creation

## Before Creating

### CLI
```bash
# Search for existing tasks first
knowns search "keyword" --type task --plain
```

---

## Create Task

### CLI
```bash
knowns task create "Clear title (WHAT)" \
  -d "Description (WHY)" \
  --ac "Outcome 1" \
  --ac "Outcome 2" \
  --priority medium \
  -l "labels"
```

---

## Quality Guidelines

### Title
| Bad | Good |
|-----|------|
| Do auth stuff | Add JWT authentication |
| Fix bug | Fix login timeout |

### Description
Explain WHY. Include doc refs: `@doc/security-patterns`

### Acceptance Criteria
**Outcome-focused, NOT implementation steps:**

| Bad | Good |
|-----|------|
| Add handleLogin() function | User can login |
| Use bcrypt | Passwords are hashed |
| Add try-catch | Errors return proper HTTP codes |

---

## Subtasks

### CLI
```bash
knowns task create "Parent task"
knowns task create "Subtask" --parent 48  # Raw ID only!
```

---

## Anti-Patterns

- Too many AC in one task -> Split into multiple tasks
- Implementation steps as AC -> Write outcomes instead
- Skip search -> Always check existing tasks first

---

# Task Execution

## Step 1: Take Task

### CLI
```bash
knowns task edit <id> -s in-progress -a @me
knowns time start <id>    # REQUIRED!
```

---

## Step 2: Research

### CLI
```bash
# Read task and follow ALL refs
knowns task <id> --plain
# @doc/xxx → knowns doc "xxx" --plain
# @task-YY → knowns task YY --plain

# Search related docs
knowns search "keyword" --type doc --plain

# Check similar done tasks
knowns search "keyword" --type task --status done --plain
```

---

## Step 3: Plan (BEFORE coding!)

### CLI
```bash
knowns task edit <id> --plan $'1. Research (see @doc/xxx)
2. Implement
3. Test
4. Document'
```

**Share plan with user. WAIT for approval before coding.**

---

## Step 4: Implement

### CLI
```bash
# Check AC only AFTER work is done
knowns task edit <id> --check-ac 1
knowns task edit <id> --append-notes "Done: feature X"
```

---

## Scope Changes

If new requirements emerge during work:

### CLI
```bash
# Small: Add to current task
knowns task edit <id> --ac "New requirement"
knowns task edit <id> --append-notes "Scope updated: reason"

# Large: Ask user first, then create follow-up
knowns task create "Follow-up: feature" -d "From task <id>"
```

**Don't silently expand scope. Ask user first.**

---

## Key Rules

1. **Plan before code** - Capture approach first
2. **Wait for approval** - Don't start without OK
3. **Check AC after work** - Not before
4. **Ask on scope changes** - Don't expand silently

---

# Task Completion

## Definition of Done

A task is **Done** when ALL of these are complete:

### CLI
| Requirement | Command |
|-------------|---------|
| All AC checked | `knowns task edit <id> --check-ac N` |
| Notes added | `knowns task edit <id> --notes "Summary"` |
| Refs validated | `knowns validate` |
| Timer stopped | `knowns time stop` |
| Status = done | `knowns task edit <id> -s done` |
| Tests pass | Run test suite |

---

## Completion Steps

### CLI
```bash
# 1. Verify all AC are checked
knowns task <id> --plain

# 2. Add implementation notes
knowns task edit <id> --notes $'## Summary
What was done and key decisions.'

# 3. Validate refs (catch broken @doc/ @task- refs)
knowns validate

# 4. Stop timer (REQUIRED!)
knowns time stop

# 5. Mark done
knowns task edit <id> -s done
```

---

## Post-Completion Changes

If user requests changes after task is done:

### CLI
```bash
knowns task edit <id> -s in-progress    # Reopen
knowns time start <id>                   # Restart timer
knowns task edit <id> --ac "Fix: description"
knowns task edit <id> --append-notes "Reopened: reason"
```

Then follow completion steps again.

---

## Checklist

### CLI
- [ ] All AC checked (`--check-ac`)
- [ ] Notes added (`--notes`)
- [ ] Refs validated (`knowns validate`)
- [ ] Timer stopped (`time stop`)
- [ ] Tests pass
- [ ] Status = done (`-s done`)

---

# Common Mistakes

## CRITICAL: The -a Flag

| Command | `-a` Means | NOT This! |
|---------|------------|-----------|
| `task create/edit` | `--assignee` | ~~acceptance criteria~~ |
| `doc edit` | `--append` | ~~assignee~~ |

```bash
# WRONG (sets assignee to garbage!)
knowns task edit 35 -a "Criterion text"

# CORRECT (use --ac)
knowns task edit 35 --ac "Criterion text"
```

---

## CRITICAL: Notes vs Append Notes

**NEVER use `notes`/`--notes` for progress updates - it REPLACES all existing notes!**

```bash
# ❌ WRONG - Destroys audit trail!
knowns task edit <id> --notes "Done: feature X"

# ✅ CORRECT - Preserves history
knowns task edit <id> --append-notes "Done: feature X"
```

| Field | Behavior |
|-------|----------|
| `--notes` | **REPLACES** all notes (use only for initial setup) |
| `--append-notes` | **APPENDS** to existing notes (use for progress) |

---

## Quick Reference

| DON'T | DO |
|-------|-----|
| Edit .md files directly | Use CLI commands |
| `-a "criterion"` | `--ac "criterion"` |
| `--parent task-48` | `--parent 48` (raw ID) |
| `--plain` with create/edit | `--plain` only for view/list |
| `--notes` for progress | `--append-notes` for progress |
| Check AC before work done | Check AC AFTER work done |
| Code before plan approval | Wait for user approval |
| Code before reading docs | Read docs FIRST |
| Skip time tracking | Always start/stop timer |
| Skip validation | Run validate before completing |
| Ignore refs | Follow ALL `@task-xxx`, `@doc/xxx`, `@template/xxx` refs |


---

## Template Syntax Pitfalls

When writing `.hbs` templates, **NEVER** create `$` followed by triple-brace - Handlebars interprets triple-brace as unescaped output:

```
// ❌ WRONG - Parse error!
this.logger.log(`Created: $` + `{` + `{` + `{camelCase entity}.id}`);

// ✅ CORRECT - Add space between ${ and double-brace, use ~ to trim whitespace
this.logger.log(`Created: ${ {{~camelCase entity~}}.id}`);
```

| DON'T | DO |
|-------|-----|
| `$` + triple-brace | `${ {{~helper~}}}` (space + escaped) |

**Rules:**
- Add space between `${` and double-brace
- Use `~` (tilde) to trim whitespace in output
- Escape literal braces with backslash

---

## Error Recovery

| Problem | Solution |
|---------|----------|
| Set assignee to AC text | `knowns task edit <id> -a @me` |
| Forgot to stop timer | `knowns time add <id> <duration>` |
| Checked AC too early | `knowns task edit <id> --uncheck-ac N` |
| Task not found | `knowns task list --plain` |
| Replaced notes by mistake | Cannot recover - notes are lost. Use `--append-notes` next time |
| Broken refs in task/doc | Run `knowns validate`, fix refs, validate again |
<!-- KNOWNS GUIDELINES END -->
