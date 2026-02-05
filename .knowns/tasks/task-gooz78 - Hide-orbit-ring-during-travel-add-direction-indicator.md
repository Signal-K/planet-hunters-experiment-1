---
id: gooz78
title: Hide orbit ring during travel + add direction indicator
status: done
priority: medium
labels:
  - ui
  - godot
createdAt: '2026-02-05T14:12:05.131Z'
updatedAt: '2026-02-05T14:16:24.084Z'
timeSpent: 132
assignee: '@me'
---
# Hide orbit ring during travel + add direction indicator

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When rocket is not orbiting, hide orbit ring, keep rocket visible, and add a forward direction line aligned with rocket heading.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Orbit ring hides during travel/transition and rocket remains visible
- [x] #2 Direction indicator line appears aligned with rocket heading
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a direction indicator line aligned with rocket heading in both transit scenes (shown in orbit and travel)
2. Hide orbit ring during travel/transition while keeping rocket visible
3. Center rocket during travel so it remains on-screen
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Hid orbit ring during travel phases and centered rocket
- Added direction indicator line aligned with rocket heading in both transit scenes
<!-- SECTION:NOTES:END -->

