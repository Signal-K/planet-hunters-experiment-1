---
type: decision
title: Mining levels follow the laser, not a drill
project: Landnam
status: decided
created: 2026-11-05
---

# Mining levels follow the laser, not a drill (2026-11-05)

Decided by Liam, closing SSL-712.

## Decision

- **Nothing is entered.** The rover mines a deposit field. There is no drill and no "entering" a level. Do not write "drill tier" or "entry requirement" in player-facing text, scene copy or new code. A level is what the rover's laser can reach and which minerals show up.
- **Level 1 (now, and the whole of cycle 8):** the ore sits on the surface and the starting laser reaches the surface and extracts it. Minerals are the ones already marked `laserAccess: 1` in `web/lib/data/minerals.ts` (platinum, palladium, iron, silicon, ice, carbon, nickel, copper, aluminium, hydrogen, and the sky-event debris).
- **Level 2 (cycle 9):** the mining laser gets levels. Upgrading the laser introduces the second level of minerals, the ones already marked `laserAccess: 2` (iridium, rhodium, gold, cobalt, uranium). Level 3 (`laserAccess: 3`, xenon) follows the same way later. The mineral list in `minerals.ts` is the source; do not invent a second one.
- **Ground speed:** the ground scrolls faster. `SCROLL_SPEED` is now 56 (was 36; range still 16–96) in `MiningController.ts`, chosen by playing the `mining` scene: a deposit reaches the beam about every 5s and stays under it about 1.6s. iOS parity waits for cycle 9.

## Not decided here

- Deposits per screen per level, and which missions use which level, are cycle 9 design work once the laser upgrade is built.
- The older depth bands in `MiningController.ts` (tier 1: 8–30, tier 2: 32–60, tier 3: 62–96) predate this decision. Level 1 ore moves to the surface when the cycle 9 work starts. Nothing in code changes in cycle 8.
