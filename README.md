# Landnám

Landnám is a scene-first space-program game for the web and iPhone. Scenes and
missions are authored once, launch independently, and are implemented on web
and iOS.

## Start and inspect a scene

```sh
make ensure
node scripts/scene.mjs list
node scripts/scene.mjs orionids-shower-mining --check
```

Open `http://localhost:4320/game/hub?follow=1` in VS Code/Cursor **Simple
Browser: Show** once. The scene command routes that tab to an isolated fixture
and the check command reports whether it mounted. For a one-off interaction,
use `node scripts/dev-check.mjs --route <route> --see <text> --click <text>`.

No Chromium, Chrome, Playwright, Cypress, browser test stack, or screenshot
matrix is required or installed.

## Build

```sh
cd web && npm run typecheck && npm run build
xcodebuild -project native/Landnam.xcodeproj -scheme Landnam \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/landnam-ios build CODE_SIGNING_ALLOWED=NO
```

Run a focused colocated test only when it covers changed logic. See
[AGENTS.md](AGENTS.md) for the short workflow and
[shared/authoring/README.md](shared/authoring/README.md) for the scene/mission
source model.
