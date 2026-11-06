# Takeon as the shared engine

Decided 2026-11-06 (see `notes/decisions/Separate small games on one shared engine (2026-11-06).md`).

## Target shape

- `signal-k/takeon` holds one Go core: world generation, terrain, mining, sim step, snapshot and restore.
- `@takeon/engine` (TypeScript), `@takeon/pixi` (rendering), the Swift package and the Kotlin build are all
  built from that core. No game reimplements simulation rules.
- Every game (Landnám, the rover game, the solar game) is its own app on top of Takeon and shares the world and narrative.

## Where Landnám is today

| Piece | Location | State |
| --- | --- | --- |
| TS engine and Pixi adapter | `web/vendor/takeon/*.tgz` (0.2.3) | Used by `TakeOnMount`. Stays until the core ships a TS build. |
| Go-wasm loader | `web/lib/takeon/goRuntime.ts` | Optional, behind `NEXT_PUBLIC_TAKEON_GO_WASM=1`. Not a drop-in for the TS engine. |
| Swift | `native/TakeonKit` | Separate implementation. Replaced by the core's Swift build later. |
| Landnám glue | `web/lib/takeon/*` (bodies, minerals, terrain colour, sync, events) | Stays in Landnám: it maps Landnám data onto Takeon and is not engine code. |

## Rules until the core ships (SSL-778)

- No new simulation rules in `web/lib/takeon/` or `native/TakeonKit`. Put them in the takeon repo so they are written once.
- Landnám consumes Takeon only through `web/lib/takeon/` and `TakeOnMount`, so swapping the build is one place.
- Bump the vendored tgz only to a version published from takeon; do not patch it in place.
- Tapas scenes (a short rover or solar taste) are Landnám scenes registered in `qa/scenes.json` that use Takeon like any other landscape.
