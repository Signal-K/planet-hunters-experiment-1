---
id: 0w9v28
title: Refactor runtime object creation to scene files
status: todo
priority: high
labels:
  - refactor
  - architecture
  - scenes
createdAt: '2026-02-25T02:28:04.261Z'
updatedAt: '2026-02-25T02:28:39.823Z'
timeSpent: 0
---
# Refactor runtime object creation to scene files

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move procedurally generated UI elements and game objects from .gd scripts to .tscn scene files. Scripts should only contain behavior/logic, not object instantiation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify all scripts creating UI/visual objects at runtime
- [ ] #2 Move static/reusable objects to scene files
- [ ] #3 Keep only procedural/dynamic generation in scripts
- [ ] #4 Document refactoring patterns
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created analysis doc @doc/dev/scene-vs-script-refactoring-guide. Key findings: SidescrollMining.gd creates 90+ visual objects at runtime (rocks, minerals, particles). Should use object pools or pre-placed nodes in scene. Structure.gd creates collision shapes at runtime. AsteroidPreview.gd creates debris procedurally. Documented refactoring patterns and priorities.
<!-- SECTION:NOTES:END -->

