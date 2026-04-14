---
id: r36co4
title: Add mission fallback generation for invalid landing/target conditions
status: done
priority: high
labels:
  - missions
  - generation
  - reliability
createdAt: '2026-02-27T07:57:03.069Z'
updatedAt: '2026-02-27T08:16:37.422Z'
timeSpent: 0
assignee: '@me'
parent: 02buhl
---
# Add mission fallback generation for invalid landing/target conditions

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Guarantee no dead-end mission starts by introducing deterministic fallback generation when preferred landing or target placement is invalid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission start never hard-fails due to invalid target/landing generation.
- [ ] #2 Fallback scenario is playable and clearly communicated to the player.
- [ ] #3 Automated tests cover fallback trigger paths and mission continuity.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add deterministic mission-start fallback target resolver in RocketsManager (stage-aware, non-targeted, playable profile guaranteed).
2. Wire launch flow to auto-resolve missing/invalid selection and persist fallback, with clear player-facing status message.
3. Ensure fallback metadata is available in preview/debrief flows so mission continuity is preserved.
4. Add/extend automated tests for empty/invalid target sets and fallback continuity through launch selection logic.
5. Run relevant Godot test suites and update task AC/notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added deterministic mission-start fallback resolution via RocketsManager.ensure_selected_target_for_launch() so missing/invalid selections never hard-fail launch.
- Added stage 3 scanner fallback target set and stage fallback seeding when selectable target lists are empty.
- Launch flow now auto-resolves target before countdown and preserves resolved target metadata for transit/preview continuity.
- Added player-facing fallback communication in outbound transit status label via persisted launch fallback notice.
- Added structure tests for stage 3 empty-scan fallback and launch target resolver continuity.

## Verification
- ./run_tests_clean.sh
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd
<!-- SECTION:NOTES:END -->

