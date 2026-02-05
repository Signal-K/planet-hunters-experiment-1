---
id: p8rr9s
title: Revamp outbound transit scene
status: done
priority: high
labels:
  - ui
  - godot
createdAt: '2026-02-05T13:45:25.552Z'
updatedAt: '2026-02-05T14:06:29.958Z'
timeSpent: 109
assignee: '@me'
---
# Revamp outbound transit scene

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current rocket transit scene for missions traveling to targets with the inverse of the return-home sequence: depart Earth, cruise with loading bar + speed, target appears and grows, then orbit target and reveal mining UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Outbound transit shows Earth departure, cruise phase with loading bar + speed
- [x] #2 Target appears and grows, then rocket orbits target
- [x] #3 Mining UI appears when orbiting target
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a new composite transit scene that reuses asteroid preview visuals and adds travel overlay
2. Implement outbound sequence in that scene: Earth sphere orbit -> travel overlay -> target appears -> orbit -> handoff to asteroid preview
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced outbound transition with asteroid-preview-based composite scene
- Added travel overlay and Earth-to-target orbit sequence with procedural Earth sphere
<!-- SECTION:NOTES:END -->

