---
id: 7f6aja
title: >-
  Ensure that data/progress in missions is saved when testing the game in the
  Godot editor
status: done
priority: medium
labels:
  - editor
  - dx
createdAt: '2026-02-19T10:52:26.000Z'
updatedAt: '2026-02-19T03:08:57.253Z'
timeSpent: 0
assignee: '@me'
---
# Ensure that data/progress in missions is saved when testing the game in the Godot editor

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persistence regression tests that write mission progress to user:// state and verify reload roundtrip in editor/headless runs.
2. Add persistence regression for active mission state (selected target + mission entry).
3. Validate via headless experience tests and record results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added editor-persistence regression coverage in run_experience_tests: mission progress roundtrip across reload, active mission state persistence, and ordered mission-stage progression checks in headless/editor context.
<!-- SECTION:NOTES:END -->

