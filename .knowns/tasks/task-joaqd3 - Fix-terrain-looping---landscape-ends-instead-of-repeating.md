---
id: joaqd3
title: Fix terrain looping - landscape ends instead of repeating
status: done
priority: high
labels:
  - mining
  - terrain
  - bug
createdAt: '2026-02-25T02:40:53.511Z'
updatedAt: '2026-02-25T02:41:59.564Z'
timeSpent: 0
---
# Fix terrain looping - landscape ends instead of repeating

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Terrain should seamlessly loop when reaching the end, but currently stops. Implement infinite scrolling terrain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Terrain loops seamlessly at end
- [x] #2 No visible seam or gap
- [x] #3 Minerals regenerate in loop
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added _reset_minerals() function that resets collected state and visual modulation when terrain loops
<!-- SECTION:NOTES:END -->

