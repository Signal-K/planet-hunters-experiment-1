---
id: 99v5x2
title: Add accessible exit / HUD toggle for PWA mobile
status: done
priority: low
labels:
  - mobile
  - pwa
  - ux
createdAt: '2026-03-08T09:10:37.092Z'
updatedAt: '2026-03-10T05:42:37.038Z'
timeSpent: 0
---
# Add accessible exit / HUD toggle for PWA mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The PWA header (Exit button) is currently hidden on mobile. Users need a way to exit the PWA or access navigation without it cluttering the game screen. Implement a tap-to-show HUD pattern (e.g. tap top edge reveals header briefly, then auto-hides).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Exit button is reachable on mobile without permanently occupying screen space
- [x] #2 HUD auto-hides after a short timeout
- [x] #3 Works on both iOS and Android PWA
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added PWA top-edge HUD reveal handle with auto-hide (~3.5s), Save + Exit actions, and safe-area-aware HUD positioning for mobile PWA.
<!-- SECTION:NOTES:END -->

