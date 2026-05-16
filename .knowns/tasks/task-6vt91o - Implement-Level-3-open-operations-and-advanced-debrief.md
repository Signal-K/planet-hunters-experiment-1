---
id: 6vt91o
title: Implement Level 3 open operations and advanced debrief
status: done
priority: medium
labels:
  - project-landnam
  - missions
  - level3
  - debrief
createdAt: '2026-02-27T07:56:48.505Z'
updatedAt: '2026-02-27T08:44:41.076Z'
timeSpent: 303
assignee: '@me'
parent: 02buhl
---
# Implement Level 3 open operations and advanced debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable open-ended mission operation with route/mode choice, richer decision context, and expanded debrief statistics for run optimization.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player can choose route/mode and target profile with fewer hard constraints than prior levels.
- [x] #2 Mission debrief includes expanded stat breakdown and exposure optimization context.
- [x] #3 Core outcomes remain platform-consistent across web/mobile implementations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Level 3+ operation mode state in RocketsManager (e.g., survey vs extraction) with persistence and default fallback for cross-platform parity.
2. Extend Launchpad target selection UI (mission stage >=5/open operations) to let players choose operation mode and keep target profile selection less constrained.
3. Extend MissionDebrief with advanced stat breakdown (mode used, cargo efficiency, payout/exposure efficiency, target profile summary) for optimization context.
4. Add automated tests for operation mode persistence, selector/debrief stat rendering, and reload continuity to ensure platform-consistent outcomes.
5. Run mission/structure/experience test suites and complete task checklist.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added persisted open-operations route state (`contract`/`survey`) in Rockets state and RocketsManager helpers.
- Launchpad now exposes route choice for stage 5+ and relaxes contractor hard-block in Survey route while preserving Contract route behavior.
- Mission launch records now persist operation mode in mission entries; return payload carries mode through to debrief.
- Mission Debrief now includes expanded optimization stats: operation mode, target profile (distance/required level/type), cargo efficiency, and exposure efficiency.
- Debrief mission log entries now include `operation_mode` for durable post-run analysis.
- Added tests for open-operation mode persistence, survey-route contractor relaxation, and advanced debrief feedback lines.

## Verification
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_mission_log_tests.gd
- ./run_tests_clean.sh

Closed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->

