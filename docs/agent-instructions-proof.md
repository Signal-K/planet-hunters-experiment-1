
# Agent instruction loading proof (SSL-504, 2026-10-08)

Single canonical file: `AGENTS.md`. Pointers: `CLAUDE.md` (`@AGENTS.md`), `web/AGENTS.md` (points to `../AGENTS.md`, keeps the Next.js warning), `web/CLAUDE.md` (`@AGENTS.md` and `@../AGENTS.md`). `.agents/skills/landnam-design/SKILL.md` got a stale-asset notice (it still describes Godot and portrait-only).

## Claude Code (executed: `claude -p ... --max-turns 1`, run from the repo root)

Prompt 1: In one sentence, what test runner does this repo use and what is the text size floor?
Response: Playwright scene tests (`npm run test:scenes` from `web/`; Cypress has been removed), and body and map text must be at least 14px.

Prompt 2 (bug fix): I need to fix a bug in a gameplay screen. In two sentences: what must I do before marking it Done, and can unit tests alone suffice?
Response: Before marking it Done, fix the bug in the real code path (not only behind a dev preset), then run the type-check and the relevant tests (`test:scenes` for visual or flow changes). Also capture screenshots of the affected screen at 390x844, 926x428 and 1440x900, checking the real viewport via `innerWidth`/`matchMedia`. Check them for overlap, clipping, text under 14px, targets under 44px and wrong colors, and state in the handoff exactly what ran and what didn't. No, unit tests alone can't suffice: a green suite says nothing about whether the game plays, so Done needs the rendered-play proof as well.

Prompt 3 (feature/visual): I am adding a feature to the Cycle 4 build. In two sentences: what is the Cycle 4 scope, and can I make the main screen a card list with a dark theme?
Response: Cycle 4 is Free Ops (self-directed play with no contract required: mine, survey, build, trade) plus optional contracts from clients, which add direction and payout but never gate play. And no, not as described: a card list is only allowed for reference and menu surfaces, since gameplay screens must be illustrated or rendered scenes with actions attached to objects in them, and dark themes are banned outright (light blueprint style only, all colors from the CSS variables in `web/app/globals.css`).

## Other agents (file inspection only; NOT executed)

- Codex / OpenAI agents: auto-load `AGENTS.md` at the repo root (and `web/AGENTS.md` when working in `web/`, which points back to the root). Not executed here.
- Cursor, GitHub Copilot, Grok: no entry-point files exist in this repo (`.cursor/`, `.github/copilot-instructions.md`, `GROK*` all absent). Cursor reads `AGENTS.md` natively; Copilot and Grok have no repo file, so they get nothing unless pointed at `AGENTS.md`. Not executed here.
- `@` imports are Claude-specific; the root `AGENTS.md` is self-contained so non-Claude agents lose nothing.
