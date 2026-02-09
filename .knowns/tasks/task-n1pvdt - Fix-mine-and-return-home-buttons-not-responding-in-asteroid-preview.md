---
id: n1pvdt
title: Fix mine and return-home buttons not responding in asteroid preview
status: done
priority: high
labels:
  - bug
  - ui
  - input
  - preview
createdAt: '2026-02-08T04:59:32.381Z'
updatedAt: '2026-02-08T05:03:37.068Z'
timeSpent: 0
assignee: '@me'
---
# Fix mine and return-home buttons not responding in asteroid preview

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mine and Return Home controls in asteroid preview are not responding. Investigate input blocking/regression from tutorial hint overlay and restore expected button interactions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mine button triggers mining action when clicked
- [ ] #2 Return Home button triggers return flow when clicked
- [x] #3 Tutorial hint overlay does not block critical gameplay button clicks
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
🔄 Reopened: fixed parse error by removing CanvasLayer mouse_filter assignment in TutorialHintArea.gd
<!-- SECTION:NOTES:END -->

