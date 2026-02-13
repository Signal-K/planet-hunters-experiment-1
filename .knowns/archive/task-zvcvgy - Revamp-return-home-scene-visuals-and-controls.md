---
id: zvcvgy
title: Revamp return home scene visuals and controls
status: done
priority: medium
labels:
  - UI
  - Scene
  - Return
createdAt: '2026-02-04T10:02:01.329Z'
updatedAt: '2026-02-04T10:09:14.801Z'
timeSpent: 380
assignee: '@me'
---
# Revamp return home scene visuals and controls

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update rocket return scene to dark space with Earth coming into view, use stage-2 rocket animation based on rocket type, and add back button to main scene.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return scene shows dark space with Earth moving into view
- [x] #2 Rocket uses stage-2 animation for its type
- [x] #3 Back button returns to main scene
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current return home scene and script wiring.
2. Replace the background + Earth presentation and animate Earth moving into view.
3. Swap rocket sprite to stage-2 animation based on rocket type and add a Back button that returns to main scene.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reworked RocketReturn to dark space with stars + Earth sprite easing into view; rocket now uses stage-2 animation (fallback to starterrocket1 when missing).
<!-- SECTION:NOTES:END -->

