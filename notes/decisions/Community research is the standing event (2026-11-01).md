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

## Where it lives (2026-11-04)

The server reports `reachedAt`, `bonusPct`, `fuelPct` and `bonusUntil`. When the Base, Market or Community research screen sees the goal reached,
the player save keeps `player.communityBonus { month, salePct, fuelPct, until }` until the month ends, and syncs the later-expiring record.
Exchange sale prices (spot board, sell, refined goods, price alerts) add `salePct` through `permanentResearchSaleRate`.

## Not yet wired

- **Fuel +7%.** Ships have a range stat, not a fuel meter, so nothing consumes `fuelPct` yet. `communityBonusRate(player).fuel` is ready for whatever fuel or range rule lands.
- iOS reads the same fields in cycle 9.
