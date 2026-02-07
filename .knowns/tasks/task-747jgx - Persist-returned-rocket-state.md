---
id: 747jgx
title: Persist returned rocket state
status: done
priority: high
labels:
  - bug
  - godot
createdAt: '2026-02-06T01:29:28.114Z'
updatedAt: '2026-02-06T01:33:07.367Z'
timeSpent: 0
---
# Persist returned rocket state

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rockets that have completed return should be marked returned (not returningHome) and preview should skip transit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Returned rockets are marked returned in rockets_state
- [x] #2 Preview skips transit for returned rockets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record return start time when user chooses Return Home
2. After 60s, mark rocket status as returned and clear returningHome
3. Preview routing: returningHome uses return scene, returned skips transit
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Return duration set to 60s; returningHome auto-promotes to returned
- Preview now skips transit for returned rockets
<!-- SECTION:NOTES:END -->

