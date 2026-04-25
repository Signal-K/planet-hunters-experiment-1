---
title: Godot hygiene sweep plan
createdAt: '2026-03-07T01:39:23.883Z'
updatedAt: '2026-03-07T01:39:34.927Z'
description: >-
  Scope, methodology, and acceptance checks for full Godot codebase hygiene
  sweep
tags:
  - godot
  - cleanup
  - stability
---
# Godot Hygiene Sweep Plan

## Scope
- Detect duplicate/legacy scene, script, and object artifacts.
- Remove or archive safe duplicates and update references as needed.
- Fix bugs/issues surfaced by checks and tests.
- Run Godot test suite and smoke checks.

## Method
1. Duplicate scan: filename + hash scan in `scene/` for `.gd`, `.tscn`, `.tres`, and assets.
2. Static health checks: task/doc reference validation and Godot headless load checks for core scenes.
3. Automated tests: project script/test harness run(s).
4. Fix-forward loop until no high-confidence breakages remain.

## Deliverables
- Code cleanup/fixes in Godot codebase.
- Updated Knowns task notes and checkoffs.
- Summary of any residual non-blocking warnings.
