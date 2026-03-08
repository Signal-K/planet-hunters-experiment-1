---
title: Mining scene recovery implementation notes
createdAt: '2026-03-06T23:34:48.437Z'
updatedAt: '2026-03-07T00:59:57.607Z'
description: Execution notes and validation checklist for mining scene recovery thread
tags:
  - implementation
  - mining
  - godot
  - stability
---
# Mining Scene Recovery Implementation Notes

## Execution Checklist
- [ ] Identify root cause of scene-open failure (`MiningMinigame.tscn` + related resources).
- [ ] Patch invalid/missing references and validate scene parsing.
- [ ] Re-enable or add direct side-scrolling mining launch path for testing.
- [ ] Implement portrait mobile reflow in mining scene/UI script.
- [ ] Run targeted tests/manual checks.

## Evidence to Capture
- Exact missing-resource/parse errors found.
- Files changed for scene references.
- Entry path used for direct mining testing.
- Portrait viewport dimensions used for verification.


## Findings
- Root cause for editor-open regression: `scene/Scenes/UI/MiningMinigame.tscn` referenced missing script `res://Scripts/UI/MiningMinigame.gd`.
- Added compatibility script at `scene/Scripts/UI/MiningMinigame.gd` so legacy scene loads in editor and still supports `start_mining(...)` delegation when invoked at runtime.

## Validation Evidence
- Missing-resource scan for mining scenes returns clean (no unresolved ext_resource paths).
- Headless Godot load checks succeeded for:
  - `res://Scenes/UI/MiningMinigame.tscn`
  - `res://Scenes/UI/SidescrollMining.tscn`
  - `res://Scenes/UI/MiningPracticePanel.tscn`
- Added launchpad shortcut button: "Open Mining Academy" to enter side-scrolling mining practice without progression gating.

## Portrait Reflow Changes
- Added portrait-mobile mode in `SidescrollMining.gd` (`viewport.x < 900 && viewport.y > viewport.x`).
- Reorganized HUD placement for portrait:
  - top gauges remain top bar
  - stats stack moved below top bar
  - contract panel shifted under stats
  - controls (fire/inventory/return) repositioned for bottom-thumb access
  - room panel moved away from gameplay center in portrait
- Added portrait-specific typography scaling for key HUD labels.


## Follow-up Scope (HUD density/off-screen)
- Triggered by user-reported screenshot showing overlapping tutorial panel + mining HUD and clipped room panel text.
- Implement compact HUD copy and viewport-safe panel placement rules.


## Follow-up Implementation (HUD declutter)
- Added compact-layout mode for narrower/shorter viewports to reduce font sizes and panel footprint.
- Added room panel toggle (`ROOMS: OFF/ON`) so room details are hidden by default in compact mode.
- Compact mode shows room icons only (full labels restored in non-compact mode).
- Rewrote guide copy to shorter one-line instructions.
- Drone panel now uses single-line text in compact mode.
- Mining scene now suspends `TutorialCoachOverlay` while active and restores it on scene exit to prevent overlay stacking.


## Follow-up Implementation (target-aware palette)
- Added target theme resolution (`asteroid`, `planet`, `other`) from mining context.
- Terrain now uses per-theme generated pixel texture palettes and per-theme contour line colors.
- Background now applies per-theme base color and tint strength for visual cohesion with target type.
