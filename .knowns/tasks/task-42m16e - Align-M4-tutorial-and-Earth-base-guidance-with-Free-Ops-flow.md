---
id: 42m16e
title: Post-M3 Free Ops handoff dialogue and Earth-base guidance
status: in-progress
priority: medium
labels: []
createdAt: '2026-04-25T00:07:08.212Z'
updatedAt: '2026-04-25T02:20:29.811Z'
timeSpent: 808
assignee: '@me'
---
# Post-M3 Free Ops handoff dialogue and Earth-base guidance

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Authored missions are M1, M2, and M3 only. After M3 the player enters Free Operations — there is no M4 tutorial. The transition should be handled by a single handoff dialogue, not a tutorial rail. This task tracks: (1) ensuring all Earth-base guidance surfaces reflect this, (2) ensuring no tutorial copy refers to an 'M4' step or gate, and (3) keeping docs aligned to the 3-mission authored arc.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No in-game copy or UI surface refers to 'Mission 4' as a tutorial step or objective — the concept does not exist
- [ ] #2 After M3 debrief, a single handoff dialogue informs the player they are now in Free Operations
- [ ] #3 Earth-base shows at most one soft guidance surface post-M3 (no stacked tutorial prompts)
- [ ] #4 All authoritative docs state the authored arc is M1–M3 only; post-M3 entry to Free Ops is dialogue-only
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

