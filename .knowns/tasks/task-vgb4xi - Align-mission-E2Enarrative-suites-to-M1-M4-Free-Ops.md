---
id: vgb4xi
title: Align mission E2E/narrative suites to M1-M4 + Free Ops
status: done
priority: high
labels:
  - project-landnam
  - tests
  - missions
  - spec-alignment
createdAt: '2026-03-10T05:43:34.099Z'
updatedAt: '2026-03-10T05:52:28.542Z'
timeSpent: 33
assignee: '@me'
---
# Align mission E2E/narrative suites to M1-M4 + Free Ops

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Headless gameplay audit shows run_mission_e2e_flow_tests and run_narrative_paths_tests still assume stage 5 flow. Update test narratives and assertions to current spec (M1-M4 authored + Free Ops).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 run_mission_e2e_flow_tests passes without stage-5 assumptions
- [x] #2 run_narrative_paths_tests passes with Free Ops replacing Mission 5 paths
- [x] #3 Test docs reflect M1-M4 + Free Ops progression
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Aligned mission E2E and narrative suites to M1-M4 + Free Ops progression.
- Updated assertions for contractor-gated free-ops target selection.
- Updated structure specs to remove legacy Mission 5 assumptions.
<!-- SECTION:NOTES:END -->

