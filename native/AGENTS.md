# AGENTS (native)

Root rules: ../AGENTS.md (token budget, map, standing rules). Do not copy rules here.

- `LandnamCore/` pure Swift domain + sync (SwiftPM, fast tests). `App/` SwiftUI app (screens in `App/Screens`, scenes in `App/Scenes`). `TakeonKit/` rover engine. `project.yml` -> `xcodegen generate` (the `.xcodeproj` is generated and gitignored).
- Never read `App/Assets.xcassets/**`, `App/Resources/Art/**` (synced from web by `npm run sync:native-assets`), `**/.build/**`, `Tests/**/Fixtures/*.json`, `App/Theme.generated.swift` (edit `shared/tokens`).
- Big files: `App/Scenes/MiningScene.swift`, `App/SceneCatalog.swift`, `App/Screens/CoreLoop.swift` - rg, then read a window.

Targeted checks
```bash
cd native/LandnamCore && swift test --filter LoopTests            # one test class (or Class/testName)
cd native && xcodegen generate && xcodebuild build -scheme Landnam -destination 'generic/platform=iOS Simulator' -quiet
xcodebuild test -scheme Landnam -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:LandnamTests/SnapshotTests/testName -quiet
```
Pipe xcodebuild through `-quiet` or `| tail -40`; never paste a full build log. No TestFlight.
