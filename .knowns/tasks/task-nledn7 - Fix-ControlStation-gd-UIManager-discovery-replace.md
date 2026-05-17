---
id: nledn7
title: Fix ControlStation.gd UIManager discovery — replace group-search with autoload ref
status: todo
priority: medium
labels:
  - project-landnam,godot,architecture,cleanup
createdAt: '2026-05-14T10:30:02.206Z'
updatedAt: '2026-05-14T10:30:02.206Z'
timeSpent: 0
---
# Fix ControlStation.gd UIManager discovery — replace group-search with autoload ref

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ControlStation.gd:17-34 (and SatelliteStation.gd) discovers UIManager using a fragile for-loop group search. This pattern is repeated in multiple files and is brittle.

Fix: use autoload reference or typed parent reference instead of group-search with for-loop fallback.

Ref: landnam/audit/megadoc-2026-05-14 HIGH-08
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 UIManager is referenced via autoload, not group search, in ControlStation.gd
- [ ] #2 Same fix applied to SatelliteStation.gd
<!-- AC:END -->

