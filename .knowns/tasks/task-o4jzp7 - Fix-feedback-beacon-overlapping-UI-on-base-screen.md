---
id: o4jzp7
title: Fix feedback beacon overlapping UI on base screen
status: done
priority: high
labels:
  - ux
  - bug
  - mobile
  - feedback-beacon
createdAt: '2026-03-01T10:20:27.791Z'
updatedAt: '2026-03-01T11:51:29.866Z'
timeSpent: 0
---
# Fix feedback beacon overlapping UI on base screen

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tester feedback: 'On the Base screen the feedback button is over something.' FeedbackBeacon (CanvasLayer layer=20) is overlapping a game UI element on the Earth/base scene. Check anchor position and move to a clear corner (bottom-right is common).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Feedback button is not covering any interactive game element on the base/earth screen
- [ ] #2 Feedback button remains accessible and visible on mobile
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved FeedbackBeacon Anchor from anchors_preset=1 (top-right) to anchors_preset=3 (bottom-right). Updated offsets: offset_top=-136, offset_bottom=-20. No longer overlaps top-right game UI.
<!-- SECTION:NOTES:END -->

