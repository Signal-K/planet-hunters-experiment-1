# Landnam iOS

`native/` is the iPhone SwiftUI/SpriteKit build. `LandnamCore/` owns the domain
model and sync; `App/` owns scenes; `SceneCatalog.swift` gives every scene an
independent simulator fixture.

Build the app:

```sh
xcodebuild -project Landnam.xcodeproj -scheme Landnam \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/landnam-ios build CODE_SIGNING_ALLOWED=NO
```

With a booted simulator, launch one fixture without playing through the game:

```sh
xcrun simctl launch booted com.atlasskyventures.sslandnam -scene mining-phone
```

The shared scene and mission source is `../shared/authoring/`; run
`node ../scripts/authoring.mjs check` after changing it. Use a filtered
`swift test --package-path LandnamCore --filter <Test>` only for changed domain
logic. There are no UI-test or all-scene snapshot matrices.
