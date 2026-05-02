---
id: z4bdkt
title: Early game - users can't go home until they've mined the target completely
status: done
priority: medium
labels:
  - mining
  - targets
  - limits
  - tutorial
  - narrative
  - early
  - missions
createdAt: '2026-02-18T22:40:53.000Z'
updatedAt: '2026-02-19T03:03:58.274Z'
timeSpent: 0
assignee: '@me'
---
# Early game - users can't go home until they've mined the target completely

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the tutorial missions (so first ~3 levels for now), the "Go Home" button isn't clickable until the user has mined the target to completion (the completion value should be based on 1) the level of the rocket (which determines its mining capacity, which is reflected in the overlay detailing the available mineral composition of the target) 2) the capacity of the rocket
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Lock Return Home in asteroid preview for early missions until target mining reaches completion.
2. Base unlock on actual remaining mass/capacity so rocket level and capacity govern completion.
3. Add preview regression test for locked-then-unlocked Return Home behavior.
4. Run headless experience tests and record results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Early missions now disable Return Home until mining completion; button text/gating updates as remaining mass reaches zero. Added test_early_mission_return_home_locked_until_fully_mined.
<!-- SECTION:NOTES:END -->

