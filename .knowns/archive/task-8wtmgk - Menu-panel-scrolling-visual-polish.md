---
id: 8wtmgk
title: Menu panel scrolling + visual polish
status: done
priority: medium
labels:
  - ui
  - polish
createdAt: '2026-02-06T08:12:31.986Z'
updatedAt: '2026-02-06T08:14:12.033Z'
timeSpent: 55
assignee: '@me'
---
# Menu panel scrolling + visual polish

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add scroll container and visual flair to menu panel while keeping content on-screen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Menu content scrolls and all sections remain accessible
- [x] #2 Menu visuals improved with accent styling
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add ScrollContainer to menu content
2. Introduce header accent + card backgrounds + progress bar styling
3. Ensure layout still fits and scrolls when needed
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Menu content is now scrollable.
- Added header accent, card backgrounds, and progress bar styling.

## Files
- scene/Scenes/UI/MenuPanel.tscn
- scene/Scripts/UI/MenuPanel.gd
<!-- SECTION:NOTES:END -->

