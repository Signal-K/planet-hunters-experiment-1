---
id: wr2don
title: Update mission/control station buttons
status: done
priority: medium
labels:
  - ui
  - godot
createdAt: '2026-02-05T06:19:07.754Z'
updatedAt: '2026-02-05T06:22:27.249Z'
timeSpent: 176
assignee: '@me'
---
# Update mission/control station buttons

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire New Mission to launchpad, move mission list to Control Station click, and label the Control Station with pointer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New Mission button loads the launchpad scene
- [x] #2 Clicking Control Station opens the mission list UI previously on New Mission
- [x] #3 Control Station has a labeled pointer reading 'Control Station'
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate New Mission button handlers and update to open launchpad scene
2. Update ControlStation interaction to open the New Mission panel
3. Add a Control Station label + pointer in the base Earth scene and verify placement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- New Mission button now opens the launchpad scene
- Control Station click opens the New Mission panel
- Added Control Station label + pointer in base scene
<!-- SECTION:NOTES:END -->

