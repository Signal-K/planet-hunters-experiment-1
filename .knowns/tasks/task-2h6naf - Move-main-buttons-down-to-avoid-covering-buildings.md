---
id: 2h6naf
title: Move main buttons down to avoid covering buildings
status: in-review
priority: medium
labels:
  - UI
  - Layout
createdAt: '2026-02-04T09:24:00.479Z'
updatedAt: '2026-02-04T10:08:18.961Z'
timeSpent: 127
assignee: '@me'
---
# Move main buttons down to avoid covering buildings

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust main bottom button row positioning in earth scene so buildings remain visible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Main buttons no longer overlap building tops in earth view
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the main button container in the earth/base scene.
2. Adjust its vertical offset/anchors to move it down while keeping layout stable.
3. Verify the buttons no longer overlap buildings.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Moved the main bottom button container down 20px in earth base + template scenes to avoid covering buildings.

🔄 Reopened: runtime SafeAreaUI was moving the buttons upward

- Set SafeAreaUI bottom_inset to 0 so play-mode keeps the buttons at the bottom.
<!-- SECTION:NOTES:END -->

