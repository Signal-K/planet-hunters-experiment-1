---
id: aa6vht
title: Remove M4 dead code and non-v1 mission references from codebase
status: todo
priority: medium
labels:
  - project-landnam,godot,missions,cleanup,deferred
createdAt: '2026-05-14T10:36:38.295Z'
updatedAt: '2026-05-14T10:36:38.295Z'
timeSpent: 0
---
# Remove M4 dead code and non-v1 mission references from codebase

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
V1 has exactly 3 authored missions (M1-M3) + Free Ops. M4 code is dead and contradicts the authoritative spec. Full ideas preserved at @doc/landnam/structures/mission-ideas-future-missions-deferred-spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PREDEFINED_MISSION_TARGETS[4] removed from RocketsManager.gd
- [ ] #2 mission-4-autonomy-target not reachable from any player flow
- [ ] #3 Design Decisions Log M4 entry marked deprecated
- [ ] #4 get_available_targets() confirmed to not surface M4 in Free Ops
<!-- AC:END -->

