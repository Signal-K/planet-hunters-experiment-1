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
