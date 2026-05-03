---
id: 7rek9m
title: 'iOS safe-area: bottom navigation pill overlaps game buttons'
status: todo
priority: high
labels:
  - mobile,ios,safe-area,layout
createdAt: '2026-05-03T11:40:36.464Z'
updatedAt: '2026-05-03T11:40:36.464Z'
timeSpent: 0
assignee: '@Liam'
---
# iOS safe-area: bottom navigation pill overlaps game buttons

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On iOS (browser and PWA), the home indicator (navigation pill) at the bottom of the screen covers the game's bottom action buttons (e.g. Cancel / Next in wizard flows). Fix applied: added paddingBottom: env(safe-area-inset-bottom) to the mobile game container div so the iframe never extends under the safe area. Also removed redundant height:100dvh from the iframe (flex:1 is sufficient).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile game container has paddingBottom: env(safe-area-inset-bottom)
- [ ] #2 No game buttons are hidden under the iOS home indicator
- [ ] #3 Verified on iPhone and iPad Safari
<!-- AC:END -->

