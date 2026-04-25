---
id: 55nk4i
title: Align M2/M3 tutorial and launch flow to authored progression
status: done
priority: high
labels:
  - mvp
  - onboarding
  - mission-flow
  - tutorial
createdAt: '2026-04-21T12:56:08.628Z'
updatedAt: '2026-04-22T04:44:58.336Z'
timeSpent: 2222
assignee: '@me'
parent: phx002
---
# Align M2/M3 tutorial and launch flow to authored progression

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the current game/tutorial state where Mission 2 prompts the player toward a generic new mission/contractor flow instead of the documented M2 Control Station + SR2 structured mission path, and ensure M3 introduces candidate/scanner context without prematurely enabling free-mode/open-ops language. Parent: @task-phx002.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 2 guidance directs the player to build/use the Control Station gate before Launchpad progression.
- [x] #2 Mission 2 launch prep presents SR2/structured contractor mission context, not free-mode/open-ops framing.
- [x] #3 Mission 3 guidance introduces scanner/candidate classification context and keeps mode-choice/open operations language behind the intended unlock.
- [x] #4 Tutorial/progression copy and bottom-nav affordances are consistent with M1-M4 authored onboarding docs.
- [x] #5 Regression: a save with level 5 but only one completed mission stays on Mission 2 tutorial flow, not Mission 4.
- [x] #6 Mission 2 tutorial is rebuilt as a short actionable flow centered on the Control Station base card, SR2, structured contractor, and authored target.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat the new leveling rule as source of truth: M1-M4 authored tutorial missions each grant +1 level; every 2 distinct researched/unlocked items grant +1 additional level; after M4/Free Ops, the item requirement becomes previous requirement +1, starting at 3 items.
2. Add isolated Godot unit/integration tests that create fresh sandboxed game states and verify mission/level transitions across M1 -> M2 -> M3 -> M4 -> Free Ops without relying on local save files.
3. Add tests for research/unlock-driven level gains: +1 level per 2 new items during M1-M4, then post-tutorial requirements 3, 4, 5, ... new items per level.
4. Tighten M2/M3 tutorial copy in TutorialCatalog and TutorialCoachOverlay so M2 says Control Station + SR2 + structured asteroid delivery, and M3 says TESS candidate/classification intro. Remove generic new-mission/open-ops wording during authored onboarding.
5. Update LaunchWizard mission-stage branching so M1 uses starter_contract_offer, M2-M4 use trip_contract_offer with scaled structured contractor orders, and free/open-ops language remains hidden until post-M4.
6. Persist per-launch contractor context for authored M2/M3/M4 missions in RocketsManager.add_mission / LaunchWizard so mining, Control Station cards, debrief, and payout copy agree with the selected contractor.
7. Run focused Godot test scripts for sandboxed progression, later missions, narrative paths, and new-user flow; then check acceptance criteria and notes only after verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan captured after reading mission/progression/tutorial docs and tracing LaunchWizard/Tutorial/RocketsManager flow.

Updated plan per user direction: add sandboxed mission/level transition tests and replace old XP/exposure formulas with mission + research/unlock level rules.

✓ Implemented M2 Control Station/SR2 structured flow and M3 TESS candidate context.
✓ Added explicit mission/unlock level rules and sandboxed progression tests.
✓ Verified: run_experience_tests.gd 12/12, run_later_missions_tests.gd 18/18.

✓ Progress UI now separates science XP from researched/unlocked item level progress.

🔄 Reopened: stale level/save state can skip authored mission stage.

✓ Fixed stale Mission 4 unlock by capping tutorial/scanner progress to completed mission evidence and preventing res:// state seed pollution.

🔄 Reopened: M2 tutorial is not actionable and must be replaced.

✓ Rebuilt M2 as a single actionable Control Station gate; overlay CTA now builds it directly; mission tutorial cannot advance past actual mission progress.
✓ Updated sandboxed mission-flow tests for one-step M2 gate and isolated mission-log/contractor state.
<!-- SECTION:NOTES:END -->

