---
id: ob36b9
title: Update test flow to be separated into defined behaviour
status: done
priority: medium
labels:
  - tests
  - dx
createdAt: '2026-02-19T10:58:18.000Z'
updatedAt: '2026-02-19T03:08:15.525Z'
timeSpent: 0
assignee: '@me'
---
# Update test flow to be separated into defined behaviour

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tests should be separated into completing specific missions, missions in order, making sure the tutorial works (including a tutorial for every mission), testing the pulling of supabase data, ensuring that supabase data can be viewed and interacted with in Godot scene, making sure all scene transitions work, rockets and other "unlockables" are "unlocked" at the right times based on user progressions, experience/level-related tests, etc. Godot tests should be clearly labelled and proceed in a flow so we are testing the early missions and the parts of the game (when we get to that point) that are more "sandbox-y" e.g. the construction, chosing custom missions, etc...all missions should be tested. Finally, there should be tests for all bundled versions, including react native, electron & the nextjs frontend
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define behavior-oriented flow groups for test coverage (mission order, tutorial, supabase, transitions, unlocks, XP, persistence, bundle smoke).
2. Update experience tests to include flow-index validation and missing ordered-mission coverage.
3. Add bundle smoke test coverage for React Native, Electron, and Web shell entrypoints/scripts.
4. Run affected tests and record concise flow map in implementation notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Separated tests into defined behaviour flows via flow-index validation + grouped flow labels, added ordered mission flow checks, and added bundle smoke tests for React Native, Electron, and Web/Next shell entrypoints/scripts.
<!-- SECTION:NOTES:END -->

