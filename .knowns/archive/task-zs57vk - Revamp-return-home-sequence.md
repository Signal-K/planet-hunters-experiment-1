---
id: zs57vk
title: Revamp return home sequence
status: done
priority: high
labels:
  - ui
  - godot
createdAt: '2026-02-05T13:37:41.086Z'
updatedAt: '2026-02-05T14:06:43.171Z'
timeSpent: 164
assignee: '@me'
---
# Revamp return home sequence

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update return home scene to show target departure, travel phase with loading bar + speed, Earth approach and orbit, then show mined overview panel with Earth vs space sell values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return home sequence shows target fade-out, travel phase with loading bar and speed
- [x] #2 Earth appears and grows, then rocket orbits Earth
- [x] #3 Right-side panel shows mined summary and Earth vs space sell values
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a new composite return scene that matches asteroid preview visuals and includes travel overlay
2. Implement return sequence: depart target orbit in-preview -> travel overlay -> Earth sphere appears and grows -> orbit Earth -> show summary panel
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Rebuilt return-home transition using asteroid-preview visuals and procedural Earth sphere
- Added travel overlay and summary sell-value panel on Earth orbit
<!-- SECTION:NOTES:END -->

