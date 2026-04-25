---
id: q0w4zq
title: Convert remaining LaunchWizard steps to scene-owned UI
status: todo
priority: high
labels:
  - ui
  - missions
  - launchpad
createdAt: '2026-04-24T01:35:20.542Z'
updatedAt: '2026-04-24T01:48:25.859Z'
timeSpent: 0
---
# Convert remaining LaunchWizard steps to scene-owned UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the LaunchWizard target, rocket, and confirm step layouts out of LaunchWizard.gd and into .tscn scene files so the UI is editable in Godot and consistent with the scene-owned contractor step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Target step layout and reusable cards live in .tscn scene files
- [x] #2 Rocket selection and assembly layout live in .tscn scene files
- [x] #3 Confirm step summary layout lives in .tscn scene files
- [x] #4 LaunchWizard.gd binds data into scene-owned nodes instead of constructing those step trees in code
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect LaunchWizard target, rocket, and confirm builders plus current .tscn structure.
2. Add scene-owned containers/templates for those steps in LaunchWizard.tscn and reusable template scenes where needed.
3. Refactor LaunchWizard.gd to populate existing nodes instead of constructing UI trees.
4. Add focused tests enforcing scene ownership and validate mission wizard flows.
<!-- SECTION:PLAN:END -->

