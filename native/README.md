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
