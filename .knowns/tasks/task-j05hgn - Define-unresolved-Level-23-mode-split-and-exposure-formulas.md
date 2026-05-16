---
id: j05hgn
title: Define unresolved Level 2/3 mode split and exposure formulas
status: done
priority: medium
labels:
  - project-landnam
  - spec
  - design
  - progression
createdAt: '2026-02-27T07:57:03.069Z'
updatedAt: '2026-02-27T08:27:15.174Z'
timeSpent: 0
assignee: '@me'
parent: 02buhl
---
# Define unresolved Level 2/3 mode split and exposure formulas

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve open design questions from the v0 spec: initial mode split boundaries, drag/drop scope by screen, exposure point formula, unlock thresholds, and minimum graph/data overlays.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Documented and approved definitions exist for Level 2/3 mode split and drag/drop scope.
- [x] #2 Exposure formula and unlock thresholds are explicitly specified for implementation and testing.
- [x] #3 Minimum viable graph/data overlay set is defined for first release.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Created @doc/specs/level-2-3-mode-split-and-exposure-formula-specification with explicit definitions for:
  - Level 2 vs Level 3+ mode split boundaries.
  - Drag/drop interaction scope by screen.
  - Exposure formula, XP mapping, and cumulative unlock thresholds.
  - Minimum viable graph/data overlay set for first release.
- Updated @doc/specs/mission-system-specification with resolved-definition reference.
- Updated @doc/specs/spec-task-coverage-matrix with addendum row marking this requirement set covered.

## Outcome
- Open questions from the v0 mission spec are now implementation-ready and test-referenceable.
- Definitions align with current shipped behavior (including open-operations mode in stage 5 flows) while preserving web/mobile parity.
<!-- SECTION:NOTES:END -->

