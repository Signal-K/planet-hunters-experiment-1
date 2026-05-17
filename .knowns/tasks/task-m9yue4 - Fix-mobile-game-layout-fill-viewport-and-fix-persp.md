---
id: m9yue4
title: 'Fix mobile game layout: fill viewport and fix perspective'
status: done
priority: high
labels:
  - project-landnam
  - mobile,layout,pwa
createdAt: '2026-03-23T00:48:46.820Z'
updatedAt: '2026-03-23T00:51:04.263Z'
timeSpent: 0
assignee: '@Liam'
---
# Fix mobile game layout: fill viewport and fix perspective

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile the game canvas only fills part of the screen with unused black space. PWA iframe has flex: 1 but parent has no display: flex so height is wrong. Non-PWA mobile should also use fixed positioning to fill full viewport.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Game iframe fills full viewport height on mobile browser
- [x] #2 Game iframe fills full viewport height in PWA mode
- [x] #3 No unused black space below game canvas on mobile
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed PWA iframe: added display:flex+flex-direction:column to parent div and height:100% to iframe. Fixed mobile non-PWA: main element now uses position:fixed;inset:0 and container uses height:100%;display:flex. frameStyle uses height:100% instead of 100dvh.
<!-- SECTION:NOTES:END -->

