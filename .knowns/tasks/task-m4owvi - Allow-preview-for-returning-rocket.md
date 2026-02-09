---
id: m4owvi
title: Allow preview for returning rocket
status: done
priority: medium
labels:
  - bug
  - ui
  - godot
createdAt: '2026-02-05T08:08:16.708Z'
updatedAt: '2026-02-05T08:12:02.838Z'
timeSpent: 24
assignee: '@me'
---
# Allow preview for returning rocket

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a rocket is returning home, it cannot be previewed from the missions list. Enable preview for returning missions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Returning rockets can be previewed like in-flight rockets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace mission list preview eligibility for returning rockets
2. Adjust preview logic to include return/arrived missions
3. Verify preview action opens the asteroid preview scene for returning rockets
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added returning rocket row with Preview action in mission list UI
<!-- SECTION:NOTES:END -->

