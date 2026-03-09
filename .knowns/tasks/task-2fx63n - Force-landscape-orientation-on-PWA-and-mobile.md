---
id: 2fx63n
title: Force landscape orientation on PWA and mobile
status: todo
priority: high
labels:
  - pwa
  - mobile
  - orientation
createdAt: '2026-03-08T08:48:34.136Z'
updatedAt: '2026-03-08T08:48:34.136Z'
timeSpent: 0
---
# Force landscape orientation on PWA and mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game is designed for landscape. On mobile/PWA, lock orientation programmatically and show a rotate prompt when in portrait.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Screen Orientation API lock('landscape') called on PWA/mobile mount
- [ ] #2 Rotate-to-landscape overlay triggers for isPwa||isMobile when in portrait (not just narrow-viewport isMobile)
<!-- AC:END -->

