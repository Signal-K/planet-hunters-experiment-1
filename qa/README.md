# Scene registry

`scenes.json` is the single launch registry. Each record maps an authored web
fixture to its iOS `SceneCatalog` fixture, so neither platform requires a
playthrough or a test matrix to reach a scene.

```sh
node scripts/scene.mjs list
node scripts/scene.mjs mining
node scripts/scene.mjs mining --check
```

Open `http://localhost:4320/game/hub?follow=1` once in the VS Code/Cursor
Simple Browser. `--check` routes that tab to `/game/stage?preset=<web fixture>`
and verifies that the scene mounted. Use `scripts/dev-check.mjs` for a small,
declared interaction sequence.

For iOS, build the Simulator target then launch the recorded native fixture:

```sh
xcrun simctl launch booted com.atlasskyventures.sslandnam -scene mining-phone
```

Add a registry row whenever adding a scene or mission fixture. Keep the web
preset, native id, and `scripts/preview-target.mjs` route map aligned.
