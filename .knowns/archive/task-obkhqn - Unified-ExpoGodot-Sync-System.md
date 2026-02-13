---
id: obkhqn
title: Unified Expo↔Godot Sync System
status: done
priority: high
labels:
  - sync
  - godot
  - expo
  - state
  - bridge
  - architecture
createdAt: '2026-02-03T01:26:12.341Z'
updatedAt: '2026-02-03T01:34:08.849Z'
timeSpent: 420
assignee: '@me'
---
# Unified Expo↔Godot Sync System

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete rewrite of the bidirectional sync system between React Native/Expo and Godot. Replaces the previous version-based polling approach with event-driven messaging. React Native owns persistence (AsyncStorage), Godot owns runtime state. See @doc/GODOT_INTEGRATION for architecture details. Related: @task-6h4c7d, @task-8t0o83, @task-vvgprh
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 syncState.ts provides unified state management with React hooks
- [x] #2 godotSync.ts handles worklet-based Godot communication
- [x] #3 SyncBridge.gd connects to AppController signals
- [x] #4 Godot tests verify bidirectional sync
- [x] #5 Jest tests verify React Native state persistence
- [x] #6 CI workflow exports Godot and builds Expo on main branch
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary

Complete rewrite of the Expo ↔ Godot sync system.

### Architecture
- **React Native owns persistence** (AsyncStorage via unified_sync_state_v2 key)
- **Godot owns runtime state** (authoritative during gameplay)
- **Event-driven updates** (no polling-based version conflicts)

### Files Created/Modified
- `utils/syncState.ts` - Unified state management with React hooks
- `utils/godotSync.ts` - Worklet-based Godot communication
- `scene/Scripts/Systems/SyncBridge.gd` - Godot-side sync bridge
- `scene/tests/run_sync_tests.gd` - 6 Godot sync tests
- `__tests__/syncState.test.ts` - 10 Jest sync tests
- `.github/workflows/export_build.yml` - CI workflow for main branch

### Test Results
- Jest: 10/10 passing
- Godot: 6/6 passing
<!-- SECTION:NOTES:END -->

