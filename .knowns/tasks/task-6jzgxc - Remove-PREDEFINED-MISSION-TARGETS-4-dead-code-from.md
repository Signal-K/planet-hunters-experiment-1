---
id: 6jzgxc
title: Remove PREDEFINED_MISSION_TARGETS[4] dead code from RocketsManager
status: todo
priority: medium
labels:
  - project-landnam,godot,cleanup,missions
createdAt: '2026-05-14T10:30:02.122Z'
updatedAt: '2026-05-14T10:30:02.122Z'
timeSpent: 0
---
# Remove PREDEFINED_MISSION_TARGETS[4] dead code from RocketsManager

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
RocketsManager.gd:52-74 includes a PREDEFINED_MISSION_TARGETS[4] entry (mission-4-autonomy-target) despite the authoritative spec stating M4 is not authored. This is dead code that conflicts with the spec.

Ref: landnam/audit/megadoc-2026-05-14 HIGH-07
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PREDEFINED_MISSION_TARGETS has no entry at index 4
- [ ] #2 No other code path references the removed mission-4-autonomy-target
<!-- AC:END -->

