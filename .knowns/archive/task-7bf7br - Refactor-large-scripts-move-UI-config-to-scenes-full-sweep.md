---
id: 7bf7br
title: Refactor large scripts + move UI config to scenes (full sweep)
status: done
priority: high
labels:
  - refactor
  - cleanup
createdAt: '2026-02-07T02:03:11.625Z'
updatedAt: '2026-02-09T01:37:08.792Z'
timeSpent: 5372
assignee: '@me'
---
# Refactor large scripts + move UI config to scenes (full sweep)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Split large .gd scripts into smaller components and move declarative UI setup into .tscn files where possible across the codebase.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All large scripts are split into smaller modules with clear responsibilities
- [x] #2 UI setup moved to .tscn where feasible
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor one remaining oversized mission-preview script into composable helpers
2. Move feasible static UI text/default config from script initialization to scene files
3. Update tests to validate behavior after refactor with no routing regressions
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
⚠️ Reopened: AC remain unchecked and scope is still partial (not all large scripts/UI setup have been validated as split/moved).

✓ Split mission preview route logic into Scripts/UI/NewMissionPreviewRouting.gd and removed script-owned default button copy where scene defaults suffice. Regression coverage added via run_experience_tests.gd route mapping assertions.
<!-- SECTION:NOTES:END -->

