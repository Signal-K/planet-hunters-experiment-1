---
id: 6n8s0e
title: Create mobile safe-area compatibility matrix for PWA shell
status: done
priority: high
labels:
  - spec
  - mobile
  - pwa
  - ux
createdAt: '2026-03-10T06:06:09.434Z'
updatedAt: '2026-03-10T06:36:39.687Z'
timeSpent: 81
assignee: '@me'
---
# Create mobile safe-area compatibility matrix for PWA shell

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define behavior and verification matrix for notches, camera cutouts, and dynamic-island style insets across target devices.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Spec includes safe-area handling rules for iPhone regular/Pro Max, Pixel, Samsung, Nothing
- [x] #2 Regression checklist covers portrait/landscape and installed/non-installed PWA states
- [x] #3 UI controls avoid occlusion from top/bottom insets and gesture areas
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define a mobile safe-area compatibility matrix doc for iPhone, Pixel, Samsung, Nothing across PWA states and orientations.
2. Update PWA shell behavior spec with explicit inset/control rules for cutouts and gesture areas.
3. Implement react-shell control inset adjustments while keeping full-screen backgrounds.
4. Run lightweight verification and then mark AC complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added dedicated safe-area compatibility matrix doc for iPhone regular/Pro Max, Pixel, Samsung, and Nothing families.
- Updated PWA shell behavior spec with explicit cutout/dynamic-island/gesture inset rules and regression linkage.
- Patched react-shell fixed controls to honor top/left/right/bottom safe-area insets while keeping full-screen backgrounds.
- Added compact HUD behavior on very small viewports: single Menu button expanding to Save/Exit.
<!-- SECTION:NOTES:END -->

