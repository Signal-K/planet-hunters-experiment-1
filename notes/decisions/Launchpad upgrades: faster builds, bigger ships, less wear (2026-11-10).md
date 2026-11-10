---
type: decision
title: Launchpad upgrades: faster builds, bigger ships, less wear
project: Landnam
status: decided
created: 2026-11-10
---

# Launchpad upgrades: faster builds, bigger ships, less wear (2026-11-10)

Decided by Liam for SSL-693 and SSL-792. Two upgrades above the base level (levels 2 and 3), paid in francs only, no other currency. Launchpad first; the exchange follows with two levels of its own.

| Level | Cost | Ships it can host | Structure build time | Service due after |
| --- | --- | --- | --- | --- |
| 1 | built | Explorer, Prospector (hulls up to 14U) | 10 s | 10 launches |
| 2 | F10M (unchanged) | adds the Surveyor, heavy hull 18U | 7.5 s (x0.75) | 14 launches |
| 3 | F20M (unchanged) | adds the bulk hauler hull 24U; tiers 4 and 5 wait for level 3 | 5 s (x0.5) | 20 launches |

- A hull that needs a bigger pad fails the launch check with "needs Launchpad level N". The Hangar shows the same note.
- The existing level 2 and 3 part unlocks (one and two flown missions) stay.
- Wear and maintenance (built): every launch counts (`player.padLaunches`). When the count reaches the level's limit, new launches are held (toast and launch-check line: "needs service") until the player taps the launchpad and pays F1M (`PAD_SERVICE_COST`, flat at every level, francs only), which resets the count. A bigger pad is rarer to service, not cheaper. Training launches count but stay under the first limit. Proposed numbers, easy to tune in `building-levels.ts`; Liam can change them.
- The structure-build multiplier applies to every Base structure, since structures are the only timed construction today (rockets assemble instantly).
- Numbers live in `web/lib/data/building-levels.ts` (multiplier, effects) and `rocketPadLevel` in `web/lib/data/rockets.ts`; chassis carry `padLevel`. iOS parity is parked (effect text mirrored in `BuildingLevels.swift`, not built or run).
- Art: level 2 and 3 are the line drawings in `docs/art/structures/launchpad/`, live as `launchpad-l2.png` and `launchpad-l3.png` (site map `levels` in `shared/layout/base-site.json`, each with its own height and rocket mount). Level 1 is still the painted kit sprite, so the styles differ until level 1 is redrawn. Preview: `/game/stage?preset=hub-pad-l2` and `hub-pad-l3`.
