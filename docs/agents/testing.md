# Scene verification

The workspace-owned **Landnam Preview** extension is a thin web interaction surface. It opens a populated disposable sandbox fixture (not an account or saved player state), embeds one persistent preview panel, and shows its follower heartbeat. It never manages the local stack: run `make ensure` separately when needed. Its bridge turns ordinary game-screen targets and authoring-file changes into playable stage fixtures. Scene updates do not require reloading Cursor. Install `tools/landnam-preview/landnam-preview-0.1.5.vsix` locally during development.

Confirm a change by using the scene, never by writing an e2e test or scripted
flow. Locally the Landnam Preview panel is the surface; in a cloud session
`node scripts/scene-drive.mjs` (open, look, click, tap, key, shot) plays the
scene in one persistent browser and saves a screenshot per action (see "Cloud
sessions" in AGENTS.md). There is no e2e suite or separate test stack.

1. Run **Landnam Preview: Open** from the Command Palette. Its status bar item
   must read `Landnam Preview`, not its warning state.
2. Run a single authored scene: `node scripts/scene.mjs mining --check`.
   This sends the independent stage fixture to the registered follower, checks
   that it mounted, and reports the actual viewport in the terminal and tab banner.
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

## Mining timing checks (local only)

The scene driver takes 3 to 5 seconds per action, longer than the laser window (about 2 seconds at ground speed 56). To test a timed hit by hand, open `/game/stage?preset=m1-mining&miningSpeed=0.1` (ground at a tenth speed; `off` clears it; dev server on loopback only), poll `look` until the cue says FIRE NOW, then `tap 864 366` (the Fire button; a `click` never settles because the button pulses). `&scroll=0` holds the field still instead.
