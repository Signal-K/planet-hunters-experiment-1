---
id: 6h4c7d
title: Rebuild Expo↔Godot sync pipeline
status: done
priority: medium
labels:
  - Sync
  - Godot
  - Expo
  - Tests
  - CI
createdAt: '2026-02-02T09:53:14.333Z'
updatedAt: '2026-02-02T10:05:31.362Z'
timeSpent: 715
assignee: '@me'
---
# Rebuild Expo↔Godot sync pipeline

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current cross-bridge sync mechanism with a reliable, bidirectional, single-source-of-truth approach. Remove existing sync code and tests that are part of the current approach. Related: @.knowns/tasks/task-8t0o83
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bidirectional data sync (Expo→Godot and Godot→Expo) is reliable and lossless for defined state
- [x] #2 Legacy sync code/tests removed
- [x] #3 New tests cover bidirectional sync
- [x] #4 CI workflow builds Godot export and Expo build on main
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace legacy sync helpers in RN + Godot with a snapshot/patch SyncBridge autoload and a JS sync client.
2. Update screens/components to use the new sync state store + loop; remove old queue/polling.
3. Add Godot headless sync tests + Jest sync-state tests and wire into CI; add export/build workflow.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced legacy Godot↔Expo sync with snapshot/patch SyncBridge autoload + JS sync loop and local sync store.
- Updated Loading/Game screens + FrancBalance to use new sync state.
- Added Godot sync tests, Jest syncState tests, and CI workflows for sync tests + export/build.
<!-- SECTION:NOTES:END -->

