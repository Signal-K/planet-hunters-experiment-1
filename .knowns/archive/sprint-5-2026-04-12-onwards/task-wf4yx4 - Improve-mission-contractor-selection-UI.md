---
id: wf4yx4
title: Improve mission contractor selection UI
status: done
priority: high
labels:
  - ui
  - missions
  - launchpad
createdAt: '2026-04-23T12:36:22.352Z'
updatedAt: '2026-04-23T12:46:15.237Z'
timeSpent: 573
assignee: '@me'
---
# Improve mission contractor selection UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contractor selection currently reads like a text-heavy website: tiny copy, white cards, and too much repeated explanation. Make it feel like an in-game mission contract picker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Contractor step uses large game-style contract tiles instead of full-width white web cards
- [x] #2 Contractor copy is shorter and more scannable
- [x] #3 Mineral requirements and selected state are readable at desktop scale
- [x] #4 Contractor step structure and reusable card/chip controls live in .tscn scene files
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Moved the contractor step structure into LaunchWizard.tscn so it is visible/editable in the Godot scene editor.
- Added LaunchWizardContractorCard.tscn and LaunchWizardMineralChip.tscn templates.
- LaunchWizard.gd now binds contractor data into scene-owned controls instead of constructing the contractor UI tree in code.
- Added a focused LaunchWizard scene test to verify contractor layout nodes and card templates are used.

## Verification
- PASS: tests/run_launch_wizard_scene_tests.gd
- PARTIAL: tests/run_structure_tests.gd still has an unrelated Earth-base tutorial-card state failure; LaunchWizard scenes parsed and loaded.
- PARTIAL: tests/run_mission_e2e_flow_tests.gd free-ops contractor selection passes; fresh-start tutorial progression assertion remains state-sensitive/unrelated to this contractor scene conversion.
<!-- SECTION:NOTES:END -->

