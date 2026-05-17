---
id: bjgdzw
title: 'Foundation: EventBus & Resource-Based State'
status: done
priority: high
labels:
  - project-landnam
  - godot
  - architecture
createdAt: '2026-05-14T00:32:20.831Z'
updatedAt: '2026-05-14T01:45:08.984Z'
timeSpent: 0
parent: r2shk5
order: 1
---
# Foundation: EventBus & Resource-Based State

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 EventBus implemented
- [x] #2 Resources defined
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created EventBus.gd (autoload, cross-domain signals), PlayerProfile.gd (Resource, to_snapshot/apply_snapshot), PlayerManager.gd (autoload, mirrors AppController → emits EventBus). Registered EventBus and PlayerManager in project.godot before AppController and SyncBridge.
<!-- SECTION:NOTES:END -->

