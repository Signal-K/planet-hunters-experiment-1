# Scene verification

The editor Simple Browser is the web interaction surface. There is no
Playwright, Cypress, Chromium, Chrome, headless runner, screenshot matrix, or
test stack.

1. Start once: `make ensure`, then open
   `http://localhost:4320/game/hub?follow=1` with **Simple Browser: Show**.
2. Run a single authored scene: `node scripts/scene.mjs mining --check`.
   This sends the independent stage fixture to the follower, checks that it
   mounted, and reports the actual viewport in the terminal and tab banner.
3. For a one-off interaction use
   `node scripts/dev-check.mjs --route /game/stage?preset=ui-mining --see "FIRE" --click "FIRE"`.
4. Inspect the real scene for readable text, usable controls, clipping, and
   whether the gameplay object is the thing being acted on.
5. When iOS changes, build the iOS Simulator target and launch its matching
   `SceneCatalog` id with `xcrun simctl launch booted com.atlasskyventures.sslandnam -scene <id>`.

Use `npm run test:file -- <path>` or a filtered `swift test` only for changed
logic. Do not expand a focused check into a repository-wide suite. Record the
scene, viewport, and commands actually used in the Linear handoff.
