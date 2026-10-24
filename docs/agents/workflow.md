# Fast workflow

`AGENTS.md` wins on conflict. Landnam supports web and iOS only.

1. Inspect branch/status and the active Linear issue.
2. Locate the authored scene or mission, its web renderer, and its iOS peer.
3. Change web first, then iOS. Keep the fixture/deep link working independently.
4. Run only the relevant source check and open the changed scene in Simple
   Browser. Use `node scripts/scene.mjs <scene> --check`; it routes and
   exercises the follower tab without a browser runner.
5. Build iOS when native changed:

```sh
xcodebuild -project native/Landnam.xcodeproj -scheme Landnam \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/landnam-ios build CODE_SIGNING_ALLOWED=NO
```

`make ensure` owns the local preview on port 4320. Do not start duplicate
servers or a separate test stack. CI runs typecheck and build only. The
independent fixture is the acceptance path; no full suite, browser test, or
Chromium installation is part of the workflow.
