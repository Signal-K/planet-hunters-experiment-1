# Scene verification

Confirm a change by using the scene, never by writing an e2e test or scripted
flow. Locally the editor Simple Browser is the surface; in a cloud session
`node scripts/scene-drive.mjs` (open, look, click, tap, key, shot) plays the
scene in one persistent browser and saves a screenshot per action (see "Cloud
sessions" in AGENTS.md). There is no e2e suite or separate test stack.

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

`make test` runs everything source-level in about 10 seconds: the authoring
check plus the colocated Vitest suite. Run it before a commit; for one file use
`cd web && npm run test:file -- <path>`.

Use a small source check only when it protects changed logic. The acceptance
check is the independent mission or scene fixture, not a repository-wide test
suite. Record the scene, viewport, and commands actually used in the Linear
handoff.
