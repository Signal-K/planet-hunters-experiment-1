---
id: nr8frl
title: Add drone deployment UI and controls
status: done
priority: medium
labels:
  - project-landnam
  - mining
  - drones
  - ui
createdAt: '2026-02-25T00:17:22.357Z'
updatedAt: '2026-02-25T00:21:34.555Z'
timeSpent: 0
parent: lmky3l
---
# Add drone deployment UI and controls

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement player controls to deploy drones (button/key binding) and UI feedback showing available drones and deployment status.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deployment control works (key/button)
- [x] #2 UI shows drone count
- [x] #3 Visual feedback on deployment
- [x] #4 Cooldown/limit system works
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added D key deployment control, DroneLabel UI shows count and cooldown timer, visual feedback via particle explosion, cooldown system (5s) with max 3 drones implemented in SidescrollMining.gd
<!-- SECTION:NOTES:END -->

