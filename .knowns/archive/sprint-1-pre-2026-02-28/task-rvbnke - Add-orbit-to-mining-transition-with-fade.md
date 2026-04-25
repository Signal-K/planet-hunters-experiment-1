---
id: rvbnke
title: Add orbit-to-mining transition with fade
status: done
priority: high
labels:
  - mining
  - transitions
  - ux
createdAt: '2026-02-25T03:03:19.904Z'
updatedAt: '2026-02-25T03:05:00.605Z'
timeSpent: 44
assignee: '@me'
---
# Add orbit-to-mining transition with fade

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When mining starts, show rocket orbiting target in preview scene, then fade transition to mining minigame. Creates visual continuity from space travel to mining operations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Preview scene shows rocket orbiting before mining
- [x] #2 Smooth fade transition to mining scene
- [x] #3 Maintains visual flow from transit to mining
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added _show_orbit_transition() that: 1) Hides UI elements, 2) Shows orbit rocket for 1.5s, 3) Fades out 3D asteroid and orbit, 4) Fades in mining minigame. Creates smooth visual flow from preview to mining.
<!-- SECTION:NOTES:END -->

