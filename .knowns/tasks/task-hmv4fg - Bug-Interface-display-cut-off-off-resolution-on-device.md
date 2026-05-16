---
id: hmv4fg
title: 'Bug: Interface display cut off / off-resolution on device'
status: done
priority: high
labels:
  - project-landnam
  - bug
  - mobile
  - pwa
  - layout
  - regression
createdAt: '2026-03-16T03:51:03.315Z'
updatedAt: '2026-03-16T06:49:28.814Z'
timeSpent: 0
---
# Bug: Interface display cut off / off-resolution on device

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The game interface appears at an incorrect resolution causing the display to be cut off. Elements are not fitting within the screen viewport correctly. Regression from prior iPhone/PWA layout fixes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Game canvas fills the full viewport without clipping or cutoff
- [ ] #2 All UI elements are visible and within screen bounds
- [ ] #3 Tested on iPhone in PWA and mobile browser modes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed: index.html now uses 100dvh (not 100svh) for landscape mobile media query added, react-shell.js frameStyle height changed to 100dvh. svh can exceed visible area due to browser chrome. Also added landscape media query (max-height:500px + landscape).
<!-- SECTION:NOTES:END -->

