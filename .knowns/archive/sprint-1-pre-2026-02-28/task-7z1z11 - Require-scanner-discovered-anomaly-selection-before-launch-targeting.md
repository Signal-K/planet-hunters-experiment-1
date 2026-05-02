---
id: 7z1z11
title: Require scanner-discovered anomaly selection before launch targeting
status: done
priority: high
labels:
  - missions
  - scanner
  - targeting
  - gameplay
createdAt: '2026-02-27T07:56:48.505Z'
updatedAt: '2026-02-27T08:01:24.059Z'
timeSpent: 0
assignee: '@me'
parent: 02buhl
---
# Require scanner-discovered anomaly selection before launch targeting

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace default/preselected launch targets with scanner-discovered anomalies from the Scanner structure. Launch should require selecting a scanned anomaly, with tutorial-compatible guidance and mission-stage gating.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User cannot launch to an arbitrary/default target without selecting a scanned anomaly when scanner-gated flows apply.
- [x] #2 Launchpad target selection lists scanner-discovered anomalies and persists selected target into mission state.
- [x] #3 Tutorial/mission guidance explains scan -> select -> launch flow with clear actionable UI prompts.
- [x] #4 Regression tests cover scanner-required target selection and prevent fallback to hidden defaults.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove launchpad-side anomaly auto-fetch/default targeting so scanner is the source of detected targets in scanner-gated flows.
2. Enforce explicit target selection (no auto-select) and improve launchpad guidance when no scanned anomalies are available.
3. Require fresh scan loop by clearing detected targets after successful launch; keep mission-state target persistence unchanged.
4. Add regression tests for scanner-required targeting paths and run focused test suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Removed launchpad auto-fetch and auto-target selection path so scanner-discovered targets drive scanner-gated targeting.
- Added launch-stage target validation in RocketsManager to reject non-selectable/hidden defaults.
- Added launchpad guidance for stage 3+ when no scanned targets are available.
- Cleared detected targets after scanner-gated launch to require a fresh scan loop.
- Added regression test in run_experience_tests for scanner-stage target selection gating.

## Validation
- ./run_tests_clean.sh (pass)
- bash scripts/integrate_and_run_godot_tests.sh (pass)
<!-- SECTION:NOTES:END -->

