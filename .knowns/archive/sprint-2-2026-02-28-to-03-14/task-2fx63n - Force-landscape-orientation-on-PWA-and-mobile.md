---
id: 2fx63n
title: Force landscape orientation on PWA and mobile
status: done
priority: high
labels:
  - pwa
  - mobile
  - orientation
createdAt: '2026-03-08T08:48:34.136Z'
updatedAt: '2026-03-10T05:37:37.131Z'
timeSpent: 0
---
# Force landscape orientation on PWA and mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game is designed for landscape. On mobile/PWA, lock orientation programmatically and show a rotate prompt when in portrait.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Screen Orientation API lock('landscape') called on PWA/mobile mount
- [x] #2 Rotate-to-landscape overlay triggers for isPwa||isMobile when in portrait (not just narrow-viewport isMobile)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Verified in react-shell.js: landscape lock on mount and portrait rotate overlay for (isPwa||isMobile).
<!-- SECTION:NOTES:END -->

