---
id: gjx9td
title: Refactor oversized GDScript files into reusable components
status: in-progress
priority: medium
labels:
  - refactor
  - gdscript
  - architecture
createdAt: '2026-02-27T05:57:30.842Z'
updatedAt: '2026-02-27T06:01:56.456Z'
timeSpent: 0
assignee: '@me'
---
# Refactor oversized GDScript files into reusable components

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Split large gameplay/UI scripts into focused helper components to improve maintainability and reduce regression risk while preserving behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sidescroll mining logic is split into dedicated components with existing behavior preserved
- [x] #2 At least one additional oversized UI script is split into dedicated components
- [ ] #3 Project scripts parse with no new GDScript errors introduced
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract SidescrollMining region math + nearest-target selection into a helper script and keep SidescrollMining as orchestrator.
2. Extract SidescrollMining mineral visual sync (primary/loop terrain state) into a helper script.
3. Extract TutorialCoachOverlay target-finding/rect utilities + action-hint mapping into a helper script, keeping overlay UI wiring in place.
4. Update call sites and run static parse checks (via script inspection + Godot invocation if available) to ensure no new errors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
⚠ Godot headless parse check still blocked by existing RotatedFileLogger crash on this machine; AC #3 pending in-editor verification.
<!-- SECTION:NOTES:END -->

