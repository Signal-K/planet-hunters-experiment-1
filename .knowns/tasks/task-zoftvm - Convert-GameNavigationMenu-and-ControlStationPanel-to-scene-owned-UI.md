---
id: zoftvm
title: Convert GameNavigationMenu and ControlStationPanel to scene-owned UI
status: done
priority: high
labels:
  - ui
  - menu
  - control-station
  - scene-owned
createdAt: '2026-04-24T06:57:02.352Z'
updatedAt: '2026-05-08T10:30:54.540Z'
timeSpent: 1222412
assignee: '@me'
---
# Convert GameNavigationMenu and ControlStationPanel to scene-owned UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the persistent GameNavigationMenu and ControlStationPanel layouts out of GDScript-built controls and into .tscn scene/template files so both panels are editable in Godot and follow the scene-owned UI rule.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GameNavigationMenu primary layout sections live in .tscn scene/template files
- [x] #2 ControlStationPanel primary layout sections live in .tscn scene/template files
- [x] #3 Scripts bind data into scene-owned nodes instead of constructing the primary layouts in code
- [x] #4 Panel tests cover the converted scene-owned layout paths
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect existing GameNavigationMenu and ControlStationPanel scene roots/templates and identify the primary script-built layout blocks.
2. Move the persistent GameNavigationMenu layout sections into scene/template files and update GameNavigationMenu.gd to bind scene-owned nodes.
3. Move the persistent ControlStationPanel layout sections into scene-owned nodes and update ControlStationPanel.gd to bind them.
4. Add or update panel tests for the scene-owned layout paths.
5. Verify with focused panel and structure suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Template-backed menu logbook/discovery rows; ✓ ControlStation empty/log rows; ✓ structure suite 32/32

✓ Construction project cards + contribute overlay now template-backed scenes; ✓ structure suite 33/33

✓ Job board, marketplace, room upgrades, and research cards now template-backed; ✓ structure suite 34/34

✓ Removed dead ControlStationPanel legacy builder paths; ✓ inventory + mission requirement cards now use reusable content-card scene; ✓ structure suite 34/34

✓ SatelliteStationPanel citizen-science hint + early-scan controls moved into scene; ✓ structure suite 35/35

✓ SpaceMap target dialogue converted to scene-owned overlay + contractor row templates; ✓ structure suite 36/36

✓ EmergencyLoanOfferDialog now binds scene-owned layout instead of rebuilding dialog tree; ✓ structure suite 37/37

✓ AsteroidDetailView science summary + classification row now use scene-owned templates; ✓ structure suite 38/38

✓ MissionDebriefV2 guide bullets + handoff detail rows now template-backed; ✓ structure suite 39/39

✓ MenuPanel Advanced debug controls moved into MenuPanel.tscn; ✓ structure suite 40/40

✓ MechanicIntroOverlay steps now use MechanicIntroStepRow.tscn; ✓ structure suite 41/41

✓ LaunchWizard target detail now uses LaunchWizardTargetDetail.tscn; ✓ removed dead LaunchWizard layout helper builders

✓ GameNavigationMenu stats/debug sections now use GameMenuStatColumn.tscn and GameMenuDebugSection.tscn

✓ Removed dead GameNavigationMenu layout builders for progress/unlocks/construction shell/section header after scene-template migration

✓ FrancBalance loan badge moved into FrancBalance.tscn with scene-backed LoanLabel

✓ LaunchWizardMapStep target labels now use LaunchWizardMapTargetLabel.tscn

✓ LaunchWizardMapStep labels now render into scene-owned LabelLayer using LaunchWizardMapTargetLabel metadata; ✓ run_launch_wizard_scene_tests 4/4

✓ SidescrollMining contract tracker rows now use MiningContractOrderRow.tscn; ✓ room panel rows now use MiningRoomRow.tscn; ✓ run_structure_tests 45/45

✓ GameNavigationMenu actions/settings stack now uses GameMenuActionsSection.tscn; ✓ run_structure_tests 46/46

✓ ControlStationPanel mineral empty/overflow labels now use scene templates; ✓ run_structure_tests 46/46

✓ SidescrollMining room debug overlay now uses scene-owned AtlasPreview + MarkersLayer and MiningRoomDebugMarker.tscn; ✓ run_structure_tests 47/47

✓ SidescrollMining MarsPixelBackground moved into SidescrollMining.tscn; ✓ run_structure_tests 48/48

✓ Removed dead GameNavigationMenu _build_button runtime helper after scene-backed actions migration; ✓ run_structure_tests 48/48

✓ All ACs verified complete. Structure suite 58/58 passes. GameNavigationMenu + ControlStationPanel fully template-backed.
<!-- SECTION:NOTES:END -->

