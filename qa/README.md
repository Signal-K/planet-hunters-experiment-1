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


## Live storyboard (keep open beside the terminal)

```
cd web && NEXT_PUBLIC_LANDNAM_ENV=staging npm run dev      # or any dev server on :3001
open http://localhost:3001/game/storyboard
scripts/native-shots.sh [scene-id ...]                     # native PNGs -> /tmp/landnam-snap, then "Reload all"
```

Every scene in `scenes.json`, grouped by flow, as a live iframe of `/game/stage?preset=KEY` at the real viewport (phone, landscape, desktop), with the native snapshot beside it (phone only). Filter by flow, scene, preset or ticket. "Copy ref" copies `scene (web preset, native id) @ viewport` to paste to an agent. Hot reload updates the web side as files change. Native needs a booted iOS Simulator (headless, no window); the macOS test host does not work.

### Focus view and comments

When an agent runs `scripts/storyboard-focus.sh SCENE --ticket SSL-123 --title "..." --desc "..."`, the board shows that one scene with the Linear ticket, the description and a comment box ("All scenes" returns to the grid).
Comments are appended to `/tmp/landnam-sb/comments.jsonl`; the agent streams them with `scripts/storyboard-watch.sh` (Monitor) and answers with `scripts/storyboard-reply.sh`.
In Docker, mount `/tmp/landnam-sb` read-write, `qa/` and `/tmp/landnam-snap`, and set `NEXT_PUBLIC_LANDNAM_ENV=staging`.


## One command per scene (no playing through)

```
scripts/scene.sh list                 every web preset with its hint
scripts/scene.sh cp-mid               screenshots + checks at phone, landscape, desktop -> /tmp/landnam-scenes/
scripts/scene.sh cp-mid ui-market ph  several presets, optional last arg ph|ls|dk
scripts/scene.sh all                  the whole matrix (about 5 min)
scripts/scene.sh native hub-phone     native SceneCatalog snapshot (booted simulator)
```

Checkpoints jump to a point in the playable hour: `cp-early` (~15 min), `cp-mid` (~35), `cp-late` (~55). The preset list in `web/lib/devPresets.ts` drives `screens.spec.ts`, so a new preset is checked at all three sizes automatically. `devPresets.coverage.test.ts` fails if a gameplay screen has no preset. Every scene is also asserted to paint a real frame, not only to pass layout checks.
