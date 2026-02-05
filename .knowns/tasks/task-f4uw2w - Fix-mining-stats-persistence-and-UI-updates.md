---
id: f4uw2w
title: Fix mining stats persistence and UI updates
status: in-progress
priority: high
labels:
  - bug
  - ui
  - godot
createdAt: '2026-02-05T06:25:13.443Z'
updatedAt: '2026-02-05T08:02:07.065Z'
timeSpent: 574
assignee: '@me'
---
# Fix mining stats persistence and UI updates

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remaining and total mined stats are not updating when mining; mining results aren't being saved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mining updates Remaining and Total stats in the UI when Mine is pressed
- [ ] #2 Mining results persist (saved) across scene reloads
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect mining inventory and asteroid preview flow to locate update/save break
2. Implement a fix so mining applies updates and persists state reliably
3. Verify UI updates logic for Remaining/Total display
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added direct read/write fallback for mining inventory persistence when JSON helper fails

🔄 Reopened: stats still not updating after persistence fallback

- Use apply_mining return state for UI + update minerals list/summary to show remaining
<!-- SECTION:NOTES:END -->

