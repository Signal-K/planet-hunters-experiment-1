# Landnam native (macOS 14 / iOS 17)

- `LandnamCore/`: pure Swift domain, catalog data, economy, mission systems, `GameStore`. `swift test` runs 17 tests, including parity against the TS mission generator (`Fixtures/web-board.json`).
- `TakeonKit/`: `TakeonEngine` protocol and a null engine. The sim port and SpriteKit rendering are next.
- `App/` + `project.yml`: multiplatform SwiftUI app. `xcodegen generate`, then build the `Landnam` scheme.

Saves are web-compatible JSON; unported fields round-trip untouched via `extras`.

## Status

| Area | State |
|---|---|
| Domain model, catalog, economy, mission generator | Ported, parity-tested |
| Core loop (missions, targets, rocket yard, launch, transit, mining, delivery, debrief, market) | Playable, placeholder UI (mining is tap-based) |
| Local persistence | Done |
| Other screens (refinery, skills, academy, surface ops, instrument hub, discovery, ledger, history, galaxy...) | Routed, staged stubs |
| PocketBase sync / outbox / auth | Not started |
| Takeon sim + SpriteKit scenes | Protocol only |

## Auth

Sign in with Apple is required before the hub loads (no guest route). The app sends the Apple
identity token and nonce to `POST /api/landnam-auth/apple` on the Landnam PocketBase
(`pocketbase/landnam_auth_oidc.go`), which verifies it against Apple's JWKS and mints a native
token, stored in the Keychain. `POST /api/landnam-auth/clerk` does the same for Clerk session
tokens when `CLERK_ISSUER` is set. Migration `1780712900_users_apple_clerk_identity.go` adds
`appleSub` and `clerkId` to `users`. Set `LANDNAM_PB_URL` to point the app at a PocketBase
instance (default `http://localhost:8091`). The Apple capability needs a signing team in Xcode.

## Verifying UI without launching the app

`Tests/SnapshotTests.swift` renders real screens to PNG with `ImageRenderer` on an iOS Simulator
(no window opens): `xcodebuild test -scheme Landnam -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`.
