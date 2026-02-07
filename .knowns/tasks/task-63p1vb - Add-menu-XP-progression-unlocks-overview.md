---
id: 63p1vb
title: Add menu XP progression + unlocks overview
status: done
priority: high
labels:
  - ui
  - progression
createdAt: '2026-02-06T07:59:45.576Z'
updatedAt: '2026-02-06T08:12:19.087Z'
timeSpent: 343
assignee: '@me'
---
# Add menu XP progression + unlocks overview

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Menu should show XP totals, progress to next level, and a list of unlocks by level (contractors, rockets, mission types).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Menu shows XP total, current level, and progress to next level
- [x] #2 Menu shows unlocks by level for contractors, rockets, mission types
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect MenuPanel + AppController XP APIs
2. Add XP/progress UI elements to MenuPanel
3. Populate unlock lists (contractors, rockets, mission types) by level
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added XP/progression section to the menu with progress bar and totals.
- Lists unlocks by level for rockets, contractors, and mission features.

## Files
- scene/Scenes/UI/MenuPanel.tscn
- scene/Scripts/UI/MenuPanel.gd
- scene/Scripts/Systems/AppController.gd

- Added scrollable content area and visual styling polish (header accent + cards + progress bar colors).
<!-- SECTION:NOTES:END -->

