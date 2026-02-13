---
id: 2vdopg
title: Fix low-resolution rendering and unreadable Franc balance UI
status: done
priority: high
labels:
  - bug
  - ui
  - rendering
  - godot
createdAt: '2026-02-09T01:52:17.661Z'
updatedAt: '2026-02-09T01:54:40.555Z'
timeSpent: 127
assignee: '@me'
---
# Fix low-resolution rendering and unreadable Franc balance UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game appears pixelated/low-res and the top balance panel renders white-on-white, making user franc balance unreadable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Game renders at expected resolution/clarity on desktop
- [x] #2 Franc balance text remains readable against its background
- [x] #3 Fix is covered by a targeted regression test or config assertion
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect rendering + FrancBalance styling paths
2. Apply rendering clarity and balance contrast fixes
3. Add and run targeted Godot regression tests
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Set project default canvas texture filter to linear; hardened FrancBalance button contrast in script; added tests/run_visual_quality_tests.gd (2/2 pass).
<!-- SECTION:NOTES:END -->

