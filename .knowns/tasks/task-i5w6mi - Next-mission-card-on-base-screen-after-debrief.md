---
id: i5w6mi
title: Next mission card on base screen after debrief
status: done
priority: medium
labels:
  - retention
  - ux
  - progression
createdAt: '2026-03-01T16:16:07.310Z'
updatedAt: '2026-03-07T01:30:25.819Z'
timeSpent: 54
assignee: '@me'
---
# Next mission card on base screen after debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the mission debrief closes there is no clear re-entry point. Show a 'Next mission available' card or CTA on the base screen to drive repeat play.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Base screen shows a next-mission prompt after first mission is completed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add base-screen progression cards container
2. Show next-mission CTA after first mission completion
3. Wire CTA to launchpad/new mission flow
4. Validate Earth base scene load and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added runtime Next Mission card on Earth base when completed_mission_count >= 1, with CTA wired to launchpad flow via _on_new_mission_button_pressed(). Validated earth_base_1.tscn loads headlessly.
<!-- SECTION:NOTES:END -->

