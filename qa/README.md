# Scene QA

`scenes.json` splits the game into flows and scenes. Each scene names its web DEV preset, its native snapshot, the tickets it covers and the viewports to check.

```
cd web
npm run qa:scenes -- --list
npm run qa:scenes -- --flow core-loop
npm run qa:scenes -- --scene launch-review --vp ph
npm run qa:scenes -- --ticket SSL-426
```

Each run audits the scene in headless Chrome (14px text, 44px taps, contrast, colour, panels) and writes a contact sheet to `/tmp/landnam-qa/<run>/index.html` with web screenshots per viewport and the native snapshot beside them.

Native snapshots: from `native/`, `SNAPSHOT_DIR=/tmp/landnam-snap xcodebuild test -scheme Landnam -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`, then run the command above.

To add a scene, add one entry to `scenes.json`. A web preset lives in `web/lib/devPresets.ts`; a native snapshot is a `render(..., name:)` call in `native/Tests/SnapshotTests.swift`.


## Isolated stage (no loop)

Every scene renders on its own from fixture state. No Flight Plan, sign-in gate, tickers, sync or playing through the loop.

Web (dev server on :3001):

```
http://localhost:3001/game/stage                      index of every fixture
http://localhost:3001/game/stage?preset=ui-rover-mining
http://localhost:3001/game/stage?preset=m1-debrief&patch={"francs":0}   tweak player state
cd web && node scripts/audit-rendered-screens.mjs 390 844 tag ui-rover-mining   one scene, ~10s, writes /tmp/audit-tag-ui-rover-mining.png
```

`qa:scenes` uses the stage by default. `LANDNAM_STAGE=0` audits the full game shell instead, `LANDNAM_SETTLE=ms` waits longer for canvases.

Native (scenes live in `native/App/SceneCatalog.swift`, one line each):

```
xcrun simctl launch booted com.atlasskyventures.sslandnam -scene hub-phone     show a scene in the simulator (-scene list for the index)
xcrun simctl io booted screenshot /tmp/hub.png
SCENE=hub-phone,debrief-phone xcodebuild test -scheme Landnam -only-testing:LandnamTests/SnapshotTests/catalog ...    PNGs for just those scenes
```

Do not run the Cypress pipeline to look at a screen. Use the stage, then push once when the work is done.
