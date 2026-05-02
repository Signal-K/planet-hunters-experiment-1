---
title: Level 2-3 Mode Split and Exposure Formula Specification
createdAt: '2026-02-27T08:26:11.860Z'
updatedAt: '2026-02-27T08:26:33.472Z'
description: >-
  Resolved definitions for Level 2/3 mode split, drag/drop scope, exposure
  formula and unlock thresholds, and minimum graph/data overlays
tags:
  - spec
  - progression
  - levels
  - exposure
  - reference
---
# Level 2-3 Mode Split and Exposure Formula Specification

Status: approved definition for implementation and tests (2026-02-27)

## 1) Level 2 vs Level 3 mode split

### Level 2: Structured exploration (no free mode toggle)
- Player choice is constrained to a small mission-variant list.
- Allowed route variants: short-range survey targets and one higher-yield variant.
- No contractor/survey mode toggle at Level 2.
- Purpose: preserve guided progression while introducing controlled agency.

### Level 3+: Open operations (mode/route choice enabled)
- Player chooses operation mode before selecting a target profile.
- Initial mode set:
  - `contract`: contractor bonuses/requirements apply.
  - `survey`: fewer hard constraints; no contractor requirement to launch.
- Current implementation path:
  - Mode system is active in open-operations stage flows (Mission 5 route in current build).
  - This is the shipping-safe starting boundary for web/mobile parity.

## 2) Drag-and-drop interaction scope

### In scope (v1)
- Launchpad rocket placement drag/drop:
  - Drag selected rocket card/instance to launchpad pad area.
  - Drop to commit awaiting-launch rocket placement.

### Out of scope (v1)
- Scanner target reordering drag/drop.
- Debrief resource allocation drag/drop.
- Mining scene drag-based controls.

### Rule
- If an interaction changes mission-critical state (target, payout, contractor), prefer explicit button/tap selection over drag in v1.

## 3) Exposure Points formula and unlock thresholds

## Currency mapping
- `Exposure Points` are the progression currency.
- Current implementation maps Exposure 1:1 to persisted experience XP.

## Mission exposure award
- Formula (implemented):
  - `exposure_award(stage) = 4 + (stage - 1)`
- Stage awards:
  - Stage 1: +4
  - Stage 2: +5
  - Stage 3: +6
  - Stage 4: +7
  - Stage 5: +8

## Next-level threshold formula
- Formula (implemented):
  - `xp_required_for_level(level) = 10 + level`
- Cumulative totals:
  - Reach Level 2: 11 total exposure
  - Reach Level 3: 23 total exposure
  - Reach Level 4: 36 total exposure
  - Reach Level 5: 50 total exposure

## Unlock threshold definitions (current levels)
- Rocket unlock levels:
  - SR1 at Level 1
  - SR2 at Level 2
  - SR3 at Level 3
- Scanner mission gate:
  - Scanner systems unlock by mission progression (after 2 completed missions), independent of level threshold.

## 4) Minimum viable graph/data overlays (first release)

### Launch/target selection overlays
- Target distance in AU.
- Required rocket level.
- Target type (`asteroid`/`planet`).
- Operation mode badge (`contract`/`survey`) in open operations.

### Transit overlays
- Progress bar (0..1).
- Distance remaining in km, decreasing over time.

### Debrief overlays
- Objective completion state (`Completed`/`Pending`).
- Exposure gained (or resolve exposure preview).
- Next unlock progress: `Lx -> Lx+1 (xp/current threshold)`.
- Optimization stats:
  - Operation mode.
  - Target profile summary (distance/required level/type).
  - Cargo efficiency (`F/unit`).
  - Exposure efficiency (`exposure/unit`).

## 5) Testability targets
- Structure tests assert:
  - open-operation mode persistence.
  - survey route relaxation vs contract route constraints.
- Debrief tests assert:
  - objective/exposure/unlock lines.
  - advanced optimization lines (operation mode, target profile, efficiency).

## References
- @doc/specs/mission-system-specification
- @doc/specs/level-progression-and-unlocks-specification
- @doc/specs/spec-task-coverage-matrix
