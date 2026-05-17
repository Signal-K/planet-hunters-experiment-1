---
id: w51551
title: >-
  Restore mining scene editability + standalone mining entry + portrait mobile
  layout reorg
status: done
priority: high
labels:
  - project-landnam
  - godot
  - mining
  - mobile
  - ui
  - stability
createdAt: '2026-03-06T23:34:33.033Z'
updatedAt: '2026-03-07T01:04:32.245Z'
timeSpent: 5160
assignee: '@me'
---
# Restore mining scene editability + standalone mining entry + portrait mobile layout reorg

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix scene-open regressions (e.g. MiningMinigame.tscn), ensure direct access path for side-scrolling mining test without full tutorial flow, and implement portrait-first mobile web layout reorganization for mining gameplay/UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Affected mining scenes open cleanly in Godot editor without missing-resource/script parse errors
- [x] #2 Developers can launch/test side-scrolling mining scene directly without full game progression
- [x] #3 Mobile web portrait mode presents a usable reorganized layout for mining scene (controls/readouts remain accessible)
- [x] #4 Mining HUD text density is reduced and non-essential overlays are suppressed during active mining
- [x] #5 Mining UI panels remain fully on-screen in common desktop and mobile portrait viewport sizes
- [x] #6 Mining visuals adapt palette by target type (asteroid/planet/fallback) for terrain + background
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce mining scene open failure and collect exact load errors (see @doc/specs/mining-scene-recovery-portrait-layout-specification).
2. Fix broken scene/script resource references causing editor open regressions.
3. Verify and, if needed, restore/add direct side-scrolling mining test entry path.
4. Implement portrait-mode mobile web layout reorganization for mining HUD/controls.
5. Validate in editor + targeted runtime checks and record evidence in @doc/dev/mining-scene-recovery-implementation-notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Restored `MiningMinigame.tscn` openability by adding missing compatibility script (`scene/Scripts/UI/MiningMinigame.gd`).
- Added launchpad shortcut to open Mining Academy directly (`Open Mining Academy`) for side-scrolling minigame testing without mission progression.
- Implemented portrait-specific HUD/control reflow in `scene/Scripts/UI/SidescrollMining.gd` for mobile web portrait gameplay.

## Validation
- Godot headless loads succeed for `MiningMinigame.tscn`, `SidescrollMining.tscn`, and `MiningPracticePanel.tscn`.
- Mining scene ext_resource resolution check returns no missing paths.

✓ Follow-up pass: compact HUD typography, shorter guide strings, compact drone label, room panel toggle for compact layouts, and tutorial overlay suppression while mining scene is active.

✓ Declutter pass completed for screenshot issue: compact room panel toggle, shorter mining guidance copy, compact drone text, and tutorial overlay suppression while mining.

✓ Second remediation pass for screenshot parity: always-on tutorial overlay suppression in mining _process, room panel hidden by default on all layouts (toggle only), room panel icon-only entries, and dynamic rocket lane reposition below HUD.

✓ Third pass: room panel now viewport-clamped with readable short labels and explicit toggle behavior; rocket lane moved lower; terrain fill switched to generated pixel texture + snapped contour + non-antialiased edge.

✓ Added target-aware palette adaptation: asteroid/planet/other themes now drive terrain texture colors, terrain outline color, and background tint/base color.

✓ Added MiningTargetTheme module/functionset for target-aware palettes with deterministic per-target variation and future metadata hooks (orbital period, parent star). Wired SidescrollMining to consume module for terrain/background theming.
<!-- SECTION:NOTES:END -->

