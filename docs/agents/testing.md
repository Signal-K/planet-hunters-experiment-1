# Testing and completion

Part of the Landnam agent instructions; `AGENTS.md` (repo root) is the entry point and wins on conflict. Read before claiming Done.

## Testing and completion contract

Per-iteration checks: the in-tab runner below. Playwright scene tests are the heavy visual pass, run once when batching. Cypress is only for the Orionids pacing spec, on the test stack.

```bash
cd web
npm run test:scenes        # Playwright scene tests (all viewports)
npm run test:scenes:phone  # phone subset
npm run test:unit          # verify:scene-surfaces + vitest
```

"Done" requires all of the following, and the handoff must say exactly what ran and what did not:

1. The change is implemented in the real code path, not only behind a dev preset (presets miss real state-transition bugs).
2. Type-check and relevant tests pass (targeted `test:scenes` for visual or flow-related changes; `test:unit` and native domain tests for logic). Documentation/tooling-only changes need executable checks, not invented gameplay screenshots. Run changed native destinations; keep compile, domain, snapshot and interaction evidence distinct.
3. Rendered-play proof: a screenshot of the changed screen at the one viewport it affects (**390x844** phone portrait, **926x428** phone landscape or **1440x900** desktop). The full three-viewport pass runs once at the cycle release gate, not per ticket. Verify the real viewport (`innerWidth`/`matchMedia`), since a window resize can silently no-op. Look at the screenshots for overlap, clipping, text under 14px, targets under 44px, and wrong colors.
4. Unit tests alone never justify Done or "works". A green suite says nothing about whether the game plays.
5. Never claim a check passed that you did not run. State what ran, what was skipped, and why. Heavy pipelines (20+ minute e2e) are not run per iteration: iterate with targeted local checks and push batched.
6. Do not drive the user's own device or desktop (no osascript clicks, desktop captures, or launching windows). Test headless or in the iOS Simulator.
7. Scene visual check, on every scene task: objects rest on their surfaces with no gaps, and anything that should animate does. Send a short clip or frame strip with the stills.

## Fast loop: checks inside Cursor (default for every iteration)
No Playwright, no Cypress, no second stack. Liam keeps the Simple Browser open on `http://localhost:4320/game/hub?follow=1`; checks run in that tab and report back to you.

```bash
node scripts/dev-check.mjs --list               # named checks live in scripts/checks.json
node scripts/dev-check.mjs orionids-board       # navigate, run the steps, PASS/FAIL in seconds (banner in the tab too)
node scripts/dev-check.mjs --route /game/hub --click "OPEN" --see "SELL"   # one-off
node scripts/dev-check.mjs hub-loads --native hub-phone   # also render the native scene on a booted simulator
```
Steps are `{ click }`, `{ see }` (text or CSS selector), `{ gone }`, `{ key }`, `{ wait }`; a failed step names the step and prints the page text. Add a check to `scripts/checks.json` whenever you fix a flow bug. The result includes the real viewport (`innerWidth x innerHeight`). Exit 3 means no tab answered: ask Liam to open the follow URL; do not fall back to a headless browser.

## Stack lifecycle (never break the preview tab)
- `make ensure` (the SessionStart hook runs it) starts the stack only if it is not healthy and holds a lock. Never run `make up` or `make down` when `:4320` is healthy; sessions ending no longer stop the stack.
- Scripted or long runs (Cypress pacing, anything that writes game state) use the test stack: `make test-up` gives web on `:4321` and its own PocketBase on `:8097`. Run with `CYPRESS_BASE_URL=http://localhost:4321`, then `make test-down`.
- Anything that takes over 60 seconds is a batched, one-off run, never per iteration.

## Orionids pacing (headless Cypress, batched only)
`cd web && CYPRESS_BASE_URL=http://localhost:4321 npm run test:orionids` plays the Orionids shower run in real time (the pacing rule is the point, so it cannot be shortened) and asserts each stage takes 40 to 240 seconds. Needs `make test-up`. `--expose VP=phone` runs one viewport. Never aim it at `:4320`.
