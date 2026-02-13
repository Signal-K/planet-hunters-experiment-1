---
id: cd7ekw
title: >-
  Fix mission debrief errors + implement contractor pricing + archive & scrap
  flow
status: done
priority: high
labels:
  - bug
  - ui
  - godot
createdAt: '2026-02-06T01:22:58.335Z'
updatedAt: '2026-02-06T01:27:34.511Z'
timeSpent: 0
---
# Fix mission debrief errors + implement contractor pricing + archive & scrap flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve current MissionDebrief errors and implement contractor-based space sale, locked Earth sale until level, archive mission log, and scrap rocket after sale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MissionDebrief loads without errors
- [x] #2 Earth sale locked until required level
- [x] #3 Space sale uses contractor pricing and archives mission, scraps rocket, returns to Earth
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix MissionDebrief node wiring errors and null access
2. Add contractor pricing model and lock Earth sale by level
3. On space sale: archive mission log, scrap rocket (20% refund), return to Earth
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Fixed MissionDebrief null ArchiveButton and panel wiring
- Added contractor pricing + earth sale lock by level
- Space sale archives log, scraps rocket (20%), returns to Earth
<!-- SECTION:NOTES:END -->

