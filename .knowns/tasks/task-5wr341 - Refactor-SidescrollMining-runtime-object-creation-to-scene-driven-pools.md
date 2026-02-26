---
id: 5wr341
title: Refactor SidescrollMining runtime object creation to scene-driven pools
status: done
priority: high
labels:
  - architecture
  - refactor
  - mining
createdAt: '2026-02-26T01:52:18.365Z'
updatedAt: '2026-02-26T02:18:11.289Z'
timeSpent: 171
assignee: '@me'
parent: blav3e
---
# Refactor SidescrollMining runtime object creation to scene-driven pools

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move visual object creation out of runtime script into scene/template pools to improve performance and maintainability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Runtime creation of repeated visual objects is replaced with scene-managed pools
- [x] #2 Mining gameplay and reward behavior remain unchanged
- [x] #3 Scene/script structure follows scene-vs-script refactor guidance
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit SidescrollMining runtime-created visual/game objects against @doc/scene-vs-script-refactoring-guide.
2. Move repeated runtime-created objects to scene-managed pools/templates (drone deployment and background setup).
3. Keep mining reward/collection flow unchanged and add notes/tests where practical for regression confidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ SidescrollMining now uses scene-managed DronePool (no runtime MiningDrone instantiation).

✓ Removed runtime sky node creation path from SidescrollMining; scene background remains source-of-truth.

✓ MiningDrone updated for pool lifecycle (available/active state) instead of queue_free-based one-shot instances.

Static check: no instantiate/new-based visual object creation remains in SidescrollMining except RNG utility allocation.

Note: verification in this pass is code-level/static only; no Godot runtime execution in sandbox.
<!-- SECTION:NOTES:END -->

