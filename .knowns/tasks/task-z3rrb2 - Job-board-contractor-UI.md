---
id: z3rrb2
title: Job board contractor UI
status: done
priority: medium
labels:
  - ui
  - contractors
createdAt: '2026-03-17T06:47:52.428Z'
updatedAt: '2026-03-18T14:24:38.929Z'
timeSpent: 239
assignee: '@me'
---
# Job board contractor UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contractor panel as a job board: all available missions visible simultaneously for comparison and selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All unlocked contractors' missions visible on one screen
- [x] #2 Missions show: contractor name, mineral required, quantity, payout, mission type
- [x] #3 Market comparison legible (contractor premium vs open market)
- [x] #4 Contractor cooldown status shown inline
- [x] #5 Sorting or filtering by payout/type
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added JOB BOARD section to GameNavigationMenu. _build_job_board_card() shows all unlocked contractors (SubcontractorManager.get_roster) with: name, mineral specialisation (from bonus dict), payout vs market (+40%: 120% vs 80%), cooldown/affinity status. Legend row + note about selecting in Launchpad.
<!-- SECTION:NOTES:END -->

