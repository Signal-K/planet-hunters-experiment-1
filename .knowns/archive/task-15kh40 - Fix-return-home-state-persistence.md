---
id: 15kh40
title: Fix return-home state persistence
status: done
priority: high
labels:
  - bug
  - godot
createdAt: '2026-02-05T14:21:28.242Z'
updatedAt: '2026-02-05T14:24:44.080Z'
timeSpent: 0
---
# Fix return-home state persistence

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After mining and returning, rocket state reverts to awaitingLaunch in JSON and return state isn't saved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return-home state persists correctly in JSON after mining
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce/trace return-home flow and identify where state is overwritten
2. Inspect RocketsManager return_home + save logic for persistence issues
3. Fix state write so return-home status persists after mining
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Persisted returned_mission in rockets_state and added returningHome status
- Finalize return on mission debrief exit to reset to awaitingLaunch
<!-- SECTION:NOTES:END -->

