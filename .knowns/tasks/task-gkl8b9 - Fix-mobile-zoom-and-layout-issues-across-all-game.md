---
id: gkl8b9
title: Fix mobile zoom and layout issues across all game screens
status: todo
priority: high
labels:
  - mobile,ui,zoom,layout
createdAt: '2026-05-03T11:40:28.587Z'
updatedAt: '2026-05-03T11:40:28.587Z'
timeSpent: 0
assignee: '@Liam'
---
# Fix mobile zoom and layout issues across all game screens

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile and tablet, the game renders too small (zoomed out). Root cause: isMobile threshold (768px) excluded iPads (min-dim=768). Fix applied: raised threshold to 900px so tablets now get full-screen layout. Desktop iframe frame height also raised from 75vh/860px to 85vh/1000px. Remaining work: Godot project stretch mode needs review for small phones — requires a Godot rebuild.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 isMobile threshold raised to 900px — tablets now get full-screen game
- [ ] #2 Desktop iframe height raised to 85vh/1000px
- [ ] #3 Godot stretch mode reviewed and rebuilt for correct phone scaling
<!-- AC:END -->

