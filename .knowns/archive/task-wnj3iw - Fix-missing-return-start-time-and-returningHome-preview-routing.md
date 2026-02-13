---
id: wnj3iw
title: Fix missing return start time and returningHome preview routing
status: done
priority: high
labels:
  - bug
  - rocket-state
createdAt: '2026-02-06T01:39:32.589Z'
updatedAt: '2026-02-09T01:35:38.863Z'
timeSpent: 481
assignee: '@me'
---
# Fix missing return start time and returningHome preview routing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Return-home state lacks timestamp; preview starts at target scene. Add migration and persistence for return start time and ensure returning/returned preview routing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 returningHome rockets persist return start time
- [x] #2 returning rockets preview starts in return transit or Earth orbit based on elapsed time
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify return_home persistence of returning_started and migration fallback paths
2. Tighten preview routing logic for returningHome vs returned states
3. Add Godot tests for return start persistence + preview route selection outcomes
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added return_home persistence regression test + preview routing map test in run_experience_tests.gd (12/12 pass).
<!-- SECTION:NOTES:END -->

