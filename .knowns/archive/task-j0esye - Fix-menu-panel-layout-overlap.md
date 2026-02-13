---
id: j0esye
title: Fix menu panel layout overlap
status: done
priority: high
labels:
  - ui
  - bug
createdAt: '2026-02-06T08:17:09.843Z'
updatedAt: '2026-02-06T08:18:58.995Z'
timeSpent: 64
assignee: '@me'
---
# Fix menu panel layout overlap

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Menu panel elements overlap after styling; adjust layout for proper spacing and scroll behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Menu header and content no longer overlap
- [x] #2 Scrollable content stacks correctly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix header container sizing and padding
2. Ensure scroll content container fills width and cards layout correctly
3. Validate no overlap between header and content
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Fixed header sizing/padding and ensured header content stretches.
- Converted cards to PanelContainer + ensured scroll content fills width.

## Files
- scene/Scenes/UI/MenuPanel.tscn
<!-- SECTION:NOTES:END -->

