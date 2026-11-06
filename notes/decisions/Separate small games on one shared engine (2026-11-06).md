---
type: decision
title: Separate small games on one shared engine
project: Landnam
status: decided
created: 2026-11-06
---

# Separate small games on one shared engine (2026-11-06)

Decided by Liam, starting SSL-764.

## Decision

- The old Star Sailors client tried to hold too many minigames and became too much to build and maintain. We do not repeat that.
- Each game is its own app around one small concept, fun, vibrant and simple. Landnam is the space agency: mining, and settling locations you discover. Games that fit Landnam go into Landnam. Games that only half fit are built as separate games and are not folded into Landnam.
- All games share one world and one narrative, so a player never has to do everything.
- `signal-k/takeon` is the graphical engine for all of these games. It is one codebase that has to run on web and Node, and on iOS (Swift) and Android (Kotlin).
- Takeon gets a Go core (decided later the same day). `@takeon/engine` and `@takeon/pixi` are built from the core; the Swift and Kotlin builds consume the same core.
- Citizen science around Mars rovers (AI4Mars, Planet Four and similar) is a dedicated rover game, not part of Landnám for now. The other citizen-science structures each get their own project or game.
- Solar deploy and solar citizen science is its own game.
- Rover waypoint routes are wanted, and live only in the rover game for now.
- Landnám gives "tapas": small tastes of the scenes in the other games (for example a short rover scene), not the full games. Its base building stays minimal for the same reason.
- Old data is imported once: `user_mineral_inventory` as starting Earth stock, `linked_anomalies` as discovered bodies and rovers left on site. `mineral_deposits` and `inventory` are ignored and kept untouched.

## Consequences

- When a ticket asks to port an old feature, the question is "is it Landnam, a separate game, or dropped". It is never "add it to Landnam so it is not lost".
- Landnam must not become a sandbox again (see "Deleted 2026-10-24" in `docs/agents/product.md`).

## Open

- Migration of `native/TakeonKit` and the TypeScript engine onto the Go core (SSL-778).
