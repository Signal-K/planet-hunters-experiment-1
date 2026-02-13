---
id: dnc0c3
title: Fix returning rocket preview to start at Earth orbit
status: done
priority: high
labels:
  - bug
  - godot
createdAt: '2026-02-06T01:13:41.473Z'
updatedAt: '2026-02-06T01:17:43.172Z'
timeSpent: 0
---
# Fix returning rocket preview to start at Earth orbit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When previewing a returningHome rocket (from Control Station), it should start in Earth orbit with mineral values if the return duration has elapsed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ReturningHome preview starts at Earth orbit once return duration elapsed
- [x] #2 Mineral value context shown in Earth orbit preview
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Track return start time/duration in rockets_state and expose helpers for completion
2. Update returning preview to jump directly to Earth orbit + summary when return is complete
3. Ensure control station preview uses the return preview scene for returningHome rockets
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Persisted return start time and return completion checks
- Return preview now jumps directly to Earth orbit when return duration elapsed
<!-- SECTION:NOTES:END -->

