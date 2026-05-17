---
project: Experiment 1/Landnam
id: gkl8b9
title: Fix mobile zoom and layout issues across all game screens
status: done
priority: high
labels:
  - project-landnam
  - mobile
  - ui
  - zoom
  - layout
createdAt: '2026-05-03T11:40:28.587Z'
updatedAt: '2026-05-04T16:40:00.000Z'
timeSpent: 0
assignee: '@Liam'
---

[← Back to Index](../INDEX.md)

# Fix mobile zoom and layout issues across all game screens

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile and tablet, the game renders too small (zoomed out). Root cause: isMobile threshold (768px) excluded iPads (min-dim=768). Fix applied: raised threshold to 900px so tablets now get full-screen layout. Desktop iframe frame height also raised from 75vh/860px to 85vh/1000px. Remaining work: Godot project stretch mode needs review for small phones — requires a Godot rebuild.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-04
- Switched the Godot project stretch aspect to `keep_height` so mobile/tablet screens stop zooming the whole game out to fit extra vertical content.
- Removed `follow_viewport_enabled` from Earth and Launchpad UI canvas layers so HUD/UI no longer inherit scene camera zoom.
- Rebuilt the web export after the stretch/layout changes.
<!-- SECTION:NOTES:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 isMobile threshold raised to 900px — tablets now get full-screen game
- [x] #2 Desktop iframe height raised to 85vh/1000px
- [x] #3 Godot stretch mode reviewed and rebuilt for correct phone scaling
<!-- AC:END -->
