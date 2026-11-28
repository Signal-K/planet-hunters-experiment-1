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

## Local mining sandbox

Install Go 1.25.6+, Node.js 22+ and npm. From this repository root:

```sh
npm --prefix web ci
make dev-mining
```

Open http://localhost:4320/game?dev=1 and sign in with either local pilot:

| Pilot | Email | Password |
| --- | --- | --- |
| A (map ready) | dev-preset-ui-mission-board@example.com | DevPreset123! |
| B (base ready) | dev-preset-telescope-hub@example.com | DevPreset123! |

Use a private browser window for the second pilot. Open the Solar System map,
select the asteroid or comet, Send ship, Begin mining, then stop the marker in
three pockets and Deliver. See the mineral totals on Community Research's
weekly page. The local map's Dev targets menu can spawn replacement targets
and a 30-second comet for checking expiry.

This mode runs shared auth on 8090, Landnam PocketBase on 8096 and Next.js on
4320. All auth and game API URLs point to localhost; Clerk is disabled.
It uses isolated, gitignored data under `pocketbase/pb_data/mining-dev/` and
`pocketbase/pb_data_shared/mining-dev/`. Restarting preserves claims and
receipts and replenishes missing live target types. The two named fixture
accounts are reseeded on startup, so use them for disposable tests.

Stop with Ctrl+C. Ports must be free before startup. Override with
`SHARED_PB_PORT`, `LANDNAM_PB_DEV_PORT`, and `LANDNAM_WEB_PORT` if needed.
The first run downloads Go modules and the existing preset seeder's `tsx`
runner. The mining challenge works without optional Takeon terrain assets;
map globes use their existing fallback appearance when those assets are absent.

Account-free Takeon mining previews: [asteroid](http://localhost:4320/game/stage?preset=ui-timed-asteroid) · [comet](http://localhost:4320/game/stage?preset=ui-timed-comet). These disposable scenes never write to the weekly treasury.
