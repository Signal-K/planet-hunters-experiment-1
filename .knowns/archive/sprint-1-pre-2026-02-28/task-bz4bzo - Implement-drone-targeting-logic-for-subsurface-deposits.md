---
id: bz4bzo
title: Implement drone targeting logic for subsurface deposits
status: done
priority: high
labels:
  - mining
  - drones
  - logic
createdAt: '2026-02-25T00:17:17.992Z'
updatedAt: '2026-02-25T00:21:26.385Z'
timeSpent: 0
parent: lmky3l
---
# Implement drone targeting logic for subsurface deposits

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add logic to detect subsurface deposits and guide drones to them. Drones should seek out deposits below the visible surface layer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Drones detect subsurface deposits
- [x] #2 Drones navigate toward targets
- [x] #3 Collision detection works
- [x] #4 Deposits are destroyed on impact
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in MiningDrone.gd: _find_subsurface_target() searches 400px range for uncollected minerals, State.SEEKING navigates drone to target, collision detection via distance check, explode() marks deposits as collected and darkens them
<!-- SECTION:NOTES:END -->

