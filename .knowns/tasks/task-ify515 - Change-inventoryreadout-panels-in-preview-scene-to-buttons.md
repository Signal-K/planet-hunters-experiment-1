---
id: ify515
title: Change inventory/readout panels in preview scene to buttons
status: done
priority: high
labels:
  - project-landnam
  - preview
  - scene
  - ui
  - readout
  - panels
  - mining
  - information
createdAt: '2026-02-15T12:21:30.000Z'
updatedAt: '2026-02-17T07:17:54.392Z'
timeSpent: 1044
assignee: '@me'
---
# Change inventory/readout panels in preview scene to buttons

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect preview scene UI nodes/scripts to identify inventory/readout Panel dependencies.
2. Replace preview readout surfaces with button-based controls (scene + script wiring) while preserving mining/return behavior.
3. Update any mirrored transition scripts/scenes that share the same node contract, or keep compatibility aliases to avoid breakage.
4. Run Godot test suites affected by preview/progression UI and fix regressions.
<!-- SECTION:PLAN:END -->

