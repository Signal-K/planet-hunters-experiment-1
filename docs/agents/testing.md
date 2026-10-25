# Scene verification

The workspace-owned **Landnam Preview** extension is the web interaction surface. It opens a disposable sandbox fixture (not an account or saved player state), embeds one persistent preview panel, shows its follower heartbeat, and starts the stack only when needed. Install `tools/landnam-preview/landnam-preview-0.1.1.vsix` locally during development. There is no
Playwright, Cypress, Chromium, Chrome, headless runner, screenshot matrix, or
test stack.

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
