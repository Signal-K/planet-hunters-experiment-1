---
project: Experiment 1/Landnam
id: mjad1m
title: Fix Earth Base progression state mismatch and overlapping guidance cards
status: done
priority: medium
labels:
  - project-landnam
labels: []
createdAt: '2026-04-25T00:27:30.973Z'
updatedAt: '2026-05-08T10:30:55.140Z'
timeSpent: 0
assignee: '@me'
---

[← Back to Index](../INDEX.md)

# Fix Earth Base progression state mismatch and overlapping guidance cards

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reconcile contradictory mission/base progression state on older saves, clarify mission-stage vs discovery counts, and remove overlapping Earth Base guidance cards that make Mission 4 / Control Station / Star Map appear together.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Earth Base no longer shows contradictory progression states such as Mission 4 alongside Control Station build gating for the same save.
- [x] #2 Player-facing progression copy makes it clear that mission stage and discovered planets are different things.
- [x] #3 Main-screen progression cards do not overlap or stack redundant guidance surfaces.
- [x] #4 Regression coverage exists for legacy save reconciliation and Earth Base card visibility rules.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconcile legacy base-state flags with authored mission progress so a save cannot be Mission 4 / Free Ops while still advertising Control Station gating.
2. Remove or suppress the Earth-base Star Map card from the main screen when it only adds redundant or misleading discovery-count messaging.
3. Tighten Earth-base card visibility so only one progression card family can appear at a time, even on contradictory legacy saves.
4. Update copy/tests so mission stage is clearly progression-based, while planet charting remains a separate discovery counter.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Reconciled legacy control/scanner progression state and removed Earth Base Star Map card. ✓ Added EarthBaseActionCard scene script so progression copy/CTA defaults live in tscn-backed cards instead of earth_base_1.gd. ✓ Earth Base now ignores historical mission log rows when no live placed rocket exists. ✓ JSON save path now uses direct writes with .bak recovery for corrupted user:// state. ✓ Stabilized later-missions suite around AppController/tutorial runtime interference.

✓ All ACs verified complete. Legacy state reconciliation + card overlap removal in place.
<!-- SECTION:NOTES:END -->

