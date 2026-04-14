---
id: s71n5a
title: >-
  Tutorial _advance_if_match cannot skip past stuck steps from out-of-order
  actions
status: done
priority: high
labels:
  - tutorial
  - bug
  - state-machine
createdAt: '2026-02-28T04:22:52.642Z'
updatedAt: '2026-02-28T07:06:48.049Z'
timeSpent: 0
---
# Tutorial _advance_if_match cannot skip past stuck steps from out-of-order actions

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TutorialController._advance_if_match only advances when the CURRENT step's action_key exactly equals the recorded action_key. If the tutorial is at step N (e.g. select_launch_target) and the user records step N+1 (launch_rocket_from_earth) first (e.g. via auto-selection), the while loop sees expected_key \!= action_key and breaks, leaving the tutorial permanently stuck on step N. The completed_actions dict correctly records the action was done, but _advance_if_match never re-evaluates previously stuck steps. Identified broken orderings: (1) auto-launch before explicit target selection, (2) recording mine_target before launch step is resolved, (3) app resume after an out-of-order cross-session action sequence. Fix: when advancing, skip past steps whose action_key is already present in completed_actions before checking whether the incoming action matches the current step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial auto-advances past steps already in completed_actions before matching the incoming action
- [x] #2 User who launches without explicit target selection sees tutorial advance to mine_target step correctly
- [x] #3 Tutorial state stays consistent across all documented mission orderings: normal flow, auto-select fallback flow, cross-session resume flow
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
_advance_if_match now skips past steps whose action_key is already in completed_actions before breaking. Works for auto-select, cross-session resume, and out-of-order recordings.
<!-- SECTION:NOTES:END -->

