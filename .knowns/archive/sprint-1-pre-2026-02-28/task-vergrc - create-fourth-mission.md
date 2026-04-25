---
id: vergrc
title: Create fourth mission
status: done
priority: medium
labels:
  - missions
  - planets
  - targets
  - tutorial
  - mission4
createdAt: '2026-02-19T11:22:17.000Z'
updatedAt: '2026-02-25T08:45:01.153Z'
timeSpent: 0
assignee: '@me'
---
# Create fourth mission

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mission 4 will involve the user acquiring a level 3 rocket, which has a distance range that is 10x that of the l2 rocket. This will allow them to travel to nearby exoplanets - which are found by the scanner (the user toggles the target type from asteroid to planet). The cost of the l3 rocket should be 4B francs, but it also has a mining laser that is level 3 - so it can get 30% of all minerals on a target, which opens it up to the rarer minerals like gold and platinum (in smaller amounts). Its capacity is 5x that of the l2 starter rocket/l2 rocket (same thing) - set things up so the reward for "completely" (up to the 30% limit) mining a "level 1" planet, and scrapping the l3 rocket, is 140% of the original cost of the rocket. This mission will also explain the different subcontractors available to the user, and it will show that there are three buyers (this time, for the first time - there's multiple buyers) that you can sell your mined materials to - but you don't have a high enough affinity with the two non-default buyers to engage with them yet.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend progression data for Mission 4 and add L3 rocket support (specs, unlock levels, spawn/restore/selector mappings, vehicle scene).
2. Add Mission 4 targeting/rules in RocketsManager (planet predefined target, stage progression to 4, target profile/reward ratio behavior, level/range constraints).
3. Update launch/scanner/preview/debrief UI flows to reflect Mission 4 behavior (planet-first mission targeting, mission guidance, lock-return behavior, subcontractor/buyer messaging hooks).
4. Expand automated tests (experience + mission log/system tests) for Mission 4 stage progression, L3 unlock, mission reward ratio, and target gating; run relevant headless Godot suites.
5. Finalize task metadata (notes, AC checks if added), stop timer, and set status done once validation passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added Mission 4 progression path (mission stage 4 after third completion) and unlocked `starterrocket3` in progression + level unlock flow.
- Added `starterrocket3` spec (4B cost, 10x SR2 range, 5x SR2 cargo, L3 mining multiplier) and wired it through launchpad selector/spawner/restorer with new vehicle scene `StarterRocket3.tscn`.
- Added Mission 4 planet targeting in `RocketsManager` (`get_mission4_targets`) with untargeted-planet filtering + SR3 reachability profile, and included Mission 4 predefined target + reward ratio (1.4).
- Updated scanner filtering to support Mission 4 planet progression filtering and extended early-mission Return Home lock to include mission stage 4.
- Added Mission 4 debrief buyer messaging showing 3 buyers with affinity gating for non-default buyers.
- Calibrated Mission 4 yield scalar so full mine + scrap with SR3 lands near 140% payout target.



Spec Reference: @doc/specs/mission-system-specification (Mission 4 design)
<!-- SECTION:NOTES:END -->

