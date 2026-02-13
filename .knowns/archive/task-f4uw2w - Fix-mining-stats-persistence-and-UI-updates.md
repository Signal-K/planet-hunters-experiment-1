---
id: f4uw2w
title: Fix mining stats persistence and UI updates
status: done
priority: high
labels:
  - bug
  - ui
  - godot
createdAt: '2026-02-05T06:25:13.443Z'
updatedAt: '2026-02-09T01:31:28.236Z'
timeSpent: 859
assignee: '@me'
---
# Fix mining stats persistence and UI updates

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remaining and total mined stats are not updating when mining; mining results aren't being saved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mining updates Remaining and Total stats in the UI when Mine is pressed
- [x] #2 Mining results persist (saved) across scene reloads
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce mining UI update/persistence regression in AsteroidPreview + MiningInventory paths
2. Fix state math/UI refresh so Remaining + Total update immediately after Mine
3. Add/extend Godot tests for mining apply + persisted reload behavior
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added direct read/write fallback for mining inventory persistence when JSON helper fails

🔄 Reopened: stats still not updating after persistence fallback

- Use apply_mining return state for UI + update minerals list/summary to show remaining

✓ Fixed mining mass allocation + inventory total label refresh; added tests/run_mining_tests.gd (2/2 pass)
<!-- SECTION:NOTES:END -->

