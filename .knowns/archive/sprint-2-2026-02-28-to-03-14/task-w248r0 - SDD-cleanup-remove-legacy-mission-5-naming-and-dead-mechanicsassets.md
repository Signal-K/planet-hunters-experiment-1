---
id: w248r0
title: 'SDD cleanup: remove legacy mission-5 naming and dead mechanics/assets'
status: done
priority: high
labels:
  - cleanup
  - sdd
  - missions
  - godot
createdAt: '2026-03-10T07:21:32.274Z'
updatedAt: '2026-03-10T08:36:44.898Z'
timeSpent: 0
assignee: '@me'
---
# SDD cleanup: remove legacy mission-5 naming and dead mechanics/assets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor codebase to match current authoritative SDD docs: M1-M4 + Free Operations (contract/survey), remove legacy mission-5-named mechanics and stale assets that are no longer used, and keep behavior stable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No authored Mission 5 progression or mission5-specific naming remains in active gameplay code
- [ ] #2 Unused/dead mission/mechanic assets/scripts identified in scope are removed with references updated
- [x] #3 Core mission flow tests pass after cleanup
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline audit: map every active mission5/free-ops code path and verify against @doc/specs/mission-system-specification + @doc/specs/user-flow-and-citizen-science-specification.
2. Refactor naming/mechanics: replace mission5-specific APIs/state/UI labels with free-ops/trip-contractor terminology while preserving behavior.
3. Remove dead legacy mechanics/assets/scripts that are unreferenced and outside current M1-M4 + Free Ops scope.
4. Run regression tests (mission/experience + targeted Godot smoke) and fix issues.
5. Update task notes, check AC, stop timer, and mark done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced legacy mission5 APIs/state naming with Free Ops trip-contractor terminology across gameplay + tests.
- Removed authored Mission 5 target assumptions from runtime logic and structure tests.
- Added state migration fallback from `mission5_contract_offer` -> `trip_contract_offer` for old saves.
- Removed stale `batch_l3_m5_starterrocket3*` translation/import artifacts left behind after Free Ops batch rename.

## Validation
- ./run_all_tests.sh passed (Godot integration + JS unit suites).
<!-- SECTION:NOTES:END -->

