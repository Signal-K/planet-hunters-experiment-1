---
id: xjucc2
title: Fix drone explosion timing - exploding before hitting targets
status: done
priority: high
labels:
  - project-landnam
  - mining
  - drones
  - bug
createdAt: '2026-02-25T02:40:32.209Z'
updatedAt: '2026-02-25T02:41:25.165Z'
timeSpent: 0
---
# Fix drone explosion timing - exploding before hitting targets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drones are exploding prematurely before reaching mineral deposits. Need to adjust collision detection distance or target positioning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Drones reach target before exploding
- [x] #2 Visual impact matches explosion timing
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Adjusted target position to polygon[0].y + 20 and reduced collision distance to 15px for accurate impact
<!-- SECTION:NOTES:END -->

