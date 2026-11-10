---
type: decision
title: Launchpad upgrades: faster builds, bigger ships, less wear
project: Landnam
status: decided
created: 2026-11-10
---

# Launchpad upgrades: faster builds, bigger ships, less wear (2026-11-10)

Decided by Liam for SSL-693 and SSL-792. Two upgrades above the base level (levels 2 and 3), paid in francs only, no other currency. Launchpad first; the exchange follows with two levels of its own.

| Level | Cost | Ships it can host | Structure build time | Wear |
| --- | --- | --- | --- | --- |
| 1 | built | Explorer, Prospector (hulls up to 14U) | 10 s | normal (not built yet) |
| 2 | F10M (unchanged) | adds the Surveyor, heavy hull 18U | 7.5 s (x0.75) | less (not built yet) |
| 3 | F20M (unchanged) | adds the bulk hauler hull 24U; tiers 4 and 5 wait for level 3 | 5 s (x0.5) | least (not built yet) |

- A hull that needs a bigger pad fails the launch check with "needs Launchpad level N". The Hangar shows the same note.
- The existing level 2 and 3 part unlocks (one and two flown missions) stay.
- Wear and maintenance: a bigger pad takes less wear per launch and needs repair less often. There is no wear mechanic yet, so this is the next slice. Costs of repair are francs.
- The structure-build multiplier applies to every Base structure, since structures are the only timed construction today (rockets assemble instantly).
- Numbers live in `web/lib/data/building-levels.ts` (multiplier, effects) and `rocketPadLevel` in `web/lib/data/rockets.ts`; chassis carry `padLevel`. iOS parity is parked (effect text mirrored in `BuildingLevels.swift`, not built or run).
- Art: `docs/art/structures/launchpad/` has level 1 to 3 drawings, not wired in yet.
