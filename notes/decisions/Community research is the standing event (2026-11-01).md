---
type: decision
title: Community research is the standing event
project: Landnam
status: decided
created: 2026-11-01
---

# Community research is the standing event (2026-11-01)

Decided by Liam on SSL-685.

## Decision

- Community research is the event between sky events. The monthly goal is **100 stamps** (UTC month, every player's stamps add to one bar).
- Reaching it gives every player **+3% Exchange sale prices and +7% fuel efficiency** until the month ends.
- On the Base the goal chip takes the top-right event slot whenever no sky event is running; during a shower the sky chip has it. Tapping the chip opens Community research.
- Sky events (Orionids, Leonids, Geminids) sit on top of this; the instrument and TESS feed are the long loop.

## Not yet wired

The server reports `reachedAt`, `bonusPct`, `fuelPct` and `bonusUntil`, and the screens show them. The Exchange price and fuel
calculations do not yet read that window (they only know the permanent research bonuses on the player).
