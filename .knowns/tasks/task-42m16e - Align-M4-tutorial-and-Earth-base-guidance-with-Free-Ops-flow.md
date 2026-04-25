---
id: 42m16e
title: Align M4 tutorial and Earth-base guidance with Free Ops flow
status: in-progress
priority: medium
labels: []
createdAt: '2026-04-25T00:07:08.212Z'
updatedAt: '2026-04-25T00:20:45.377Z'
timeSpent: 808
assignee: '@me'
---
# Align M4 tutorial and Earth-base guidance with Free Ops flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove outdated Mission 4 scanner-station gating after the mission reorg, align M3/M4 citizen-science and Free Operations messaging, reduce redundant Earth-base guidance surfaces, and update authoritative docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 4 no longer tells players to build the Scanner Station when it is already built or when M3 already introduced scanner/citizen-science flow.
- [x] #2 Earth-base guidance surfaces do not stack into redundant tutorial dialogs for the same next action.
- [x] #3 Tutorial and debrief copy reflect that post-M4 the player enters Free Operations with soft guidance only.
- [x] #4 Authoritative docs are updated to match the current M3/M4 and post-M4 flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update authoritative mission/tutorial docs so M3 scanner+civilian-science intro, M4 autonomy transition, and post-M4 Free Operations are the source of truth.
2. Refactor tutorial/debrief/Earth-base guidance to remove the stale M4 scanner-build gate and replace it with soft Free Ops/contracting guidance.
3. Collapse redundant Earth-base guidance surfaces so only one primary tutorial/progression prompt shows for the same state, and increase compact tracker readability where it still appears.
4. Update/add regression coverage for debrief handoff, Earth-base cards, and mission/tutorial text so the old scanner-station assumptions do not return.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated M4 from scanner-build gate to autonomy handoff. Removed redundant Earth-base guidance stacking by hiding the compact tracker on base and delaying Star Map card until Free Ops. Added legacy scanner-state reconciliation for older saves. Updated authoritative docs and refreshed regression suites for debrief, structure, later-mission, narrative, and E2E coverage.
<!-- SECTION:NOTES:END -->

