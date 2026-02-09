---
id: kkfpyn
title: Fix preview flow for returning rockets + persist arrival flag
status: done
priority: high
labels:
  - bug
  - godot
createdAt: '2026-02-06T01:07:24.970Z'
updatedAt: '2026-02-06T01:11:04.638Z'
timeSpent: 0
---
# Fix preview flow for returning rockets + persist arrival flag

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Preview should not show outbound travel when rocket status is returningHome. Add per-rocket arrival tracking to decide transit vs orbit/preview.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Preview respects returningHome status and skips outbound travel
- [x] #2 Per-rocket arrival flag persisted and used to choose transit vs preview
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect preview routing logic and returningHome status handling
2. Add per-rocket arrival flag to rockets_state and update on arrival/return
3. Use arrival flag + status to select correct scene (transit vs preview)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added per-rocket arrival persistence (arrived) and returningHome checks
- Preview now routes to return scene when status is returningHome
<!-- SECTION:NOTES:END -->

