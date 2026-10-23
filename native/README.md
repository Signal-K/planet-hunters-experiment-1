# Landnam native (macOS 14 / iOS 17)

- `LandnamCore/`: pure Swift domain, catalog data, economy, mission systems, `GameStore`. `swift test` runs 17 tests, including parity against the TS mission generator (`Fixtures/web-board.json`).
- `TakeonKit/`: `TakeonEngine` protocol and native engine adapters. The surface simulation bridge and rendering integration. Run `TakeonKit/scripts/fetch-xcframework.sh` once to download the Go runtime (9 MB, Apple Silicon); without it the app uses its non-Takeon fallbacks.
- `App/` + `project.yml`: multiplatform SwiftUI app. `xcodegen generate`, then build the `Landnam` scheme.

Saves are web-compatible JSON; unported fields round-trip untouched via `extras`.

## Build and parity

The app supports iOS, iPadOS and macOS through `project.yml`. `App/RootView.swift` routes the real screens; `App/SceneCatalog.swift` mounts fixtures for screenshots. `LandnamCore` owns the domain model and save compatibility; `TakeonKit` integrates the surface engine. Inspect these sources rather than treating old stub lists as current status.

Implement each gameplay slice on web and then native before moving on. Run focused domain tests first:

```sh
swift test --package-path native/LandnamCore --filter LoopTests
xcodebuild -list -project native/Landnam.xcodeproj
xcodebuild -project native/Landnam.xcodeproj -scheme Landnam -destination 'platform=macOS' -derivedDataPath /tmp/landnam-derived build CODE_SIGNING_ALLOWED=NO
xcodebuild -project native/Landnam.xcodeproj -scheme Landnam -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/landnam-derived-ios build CODE_SIGNING_ALLOWED=NO
```

These commands run from the repository root. Use an installed simulator destination for tests (`xcrun simctl list devices available`); never launch the user's desktop app for verification. Regenerate the Xcode project with `cd native && xcodegen generate` only when `project.yml` or project membership changes.

Palette and layout sources live in `shared/`; generated theme files are not hand-edited. See [the canonical instructions](../AGENTS.md) for the current world and UI styles and verification requirements.

## Auth

Sign in with Apple is required before the hub loads (no guest route). The app sends the Apple
identity token and nonce to `POST /api/landnam-auth/apple` on the Landnam PocketBase
(`pocketbase/landnam_auth_oidc.go`), which verifies it against Apple's JWKS and mints a native
token, stored in the Keychain. `POST /api/landnam-auth/clerk` does the same for Clerk session
tokens when `CLERK_ISSUER` is set. Migration `1780712900_users_apple_clerk_identity.go` adds
`appleSub` and `clerkId` to `users`. Set `LANDNAM_PB_URL` to point the app at a PocketBase
instance (default `http://localhost:8091`). The Apple capability needs a signing team in Xcode.

## Cloud save and offline

Saves are written locally first, then queued in the outbox and replayed to `game_states` on reconnect. On first
sign-in per install the app reads the account's cloud save: a web player's funds, structures and missions are
adopted (only when strictly further along than local), and a mobile welcome is shown once. Pushes stay held until
that first read succeeds, so a fresh install can never overwrite a web save.

`xcodebuild test -scheme LandnamUI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'` drives real sign-in
against local PocketBase (shared :8090, Landnam :8091) with a user `tester@example.com` / `TesterPass123`.

## Verifying UI without launching the app

`Tests/SnapshotTests.swift` renders real screens to PNG with `ImageRenderer` on an iOS Simulator
(no window opens): `xcodebuild test -scheme Landnam -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`.

Filter snapshots with `SCENE` (comma-separated SceneCatalog ids) and set `SNAPSHOT_DIR` to an existing writable directory. For simulator test processes pass these through as `SIMCTL_CHILD_SCENE` and `SIMCTL_CHILD_SNAPSHOT_DIR` when required by the runner. Always verify the output files were freshly written; a successful build alone is not snapshot proof. Compare the same state at matching web/native sizes, then run the affected real flow. Headless ImageRenderer output is layout evidence; SpriteKit animation requires scene snapshots or simulator frame captures.
