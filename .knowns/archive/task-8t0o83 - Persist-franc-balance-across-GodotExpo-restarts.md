---
id: 8t0o83
title: Persist franc balance across Godot/Expo restarts
status: done
priority: medium
labels:
  - Economy
  - Persistence
  - Godot
  - Expo
createdAt: '2026-01-28T07:59:43.437Z'
updatedAt: '2026-01-28T08:06:37.991Z'
timeSpent: 402
assignee: '@me'
---
# Persist franc balance across Godot/Expo restarts

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure franc balance persists across scene changes and Expo restarts; sync Godot balance with Expo storage so state survives Godot project restart.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Franc balance persists across scene changes
- [x] #2 Franc balance persists across Expo restarts
- [x] #3 Godot and Expo stay in sync for franc balance
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace current franc balance flow between Expo AsyncStorage, worklet/shared state, and Godot AppController; identify persistence gaps.
2. Add Godot-side persistence for franc balance (user://) and load on startup; ensure scene changes use the same AppController instance.
3. Ensure Expo sync writes balance to AsyncStorage on Godot updates and restores on app start/restart; reconcile source-of-truth.
4. Validate interactions: create rocket, self-destruct, scene change, Expo restart.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Made AppController an autoload and removed scene-local instance to persist balance across scenes.
- Added Godot-side balance persistence (user://franc_balance.cfg) with load/save hooks.
- Added RN polling + storage sync for Godot balance updates and shared state.
<!-- SECTION:NOTES:END -->

