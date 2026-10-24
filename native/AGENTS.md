# iOS agent notes

Follow `../AGENTS.md`. `native/` is iOS only: `LandnamCore/` owns domain and
sync, `App/` owns SwiftUI/SpriteKit scenes, and `SceneCatalog.swift` makes each
scene launchable in the Simulator.

Build only the iOS Simulator target after native work:

```sh
xcodebuild -project native/Landnam.xcodeproj -scheme Landnam \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/landnam-ios build CODE_SIGNING_ALLOWED=NO
```

Launch the matching catalog fixture with
`xcrun simctl launch booted com.atlasskyventures.sslandnam -scene <id>`.
Do not add macOS, iPadOS, desktop targets, or broad UI/snapshot suites.
