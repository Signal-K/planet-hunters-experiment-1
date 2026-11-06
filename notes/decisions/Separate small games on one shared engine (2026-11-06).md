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

## Consequences

- When a ticket asks to port an old feature, the question is "is it Landnam, a separate game, or dropped". It is never "add it to Landnam so it is not lost".
- Landnam must not become a sandbox again (see "Deleted 2026-10-24" in `docs/agents/product.md`).

## Open

- Takeon is TypeScript (`@takeon/engine`, `@takeon/pixi`). Landnam also has a Go-compiled `native/TakeonKit`. "One codebase" needs a decision on which one is the source of truth and how the other targets consume it.
