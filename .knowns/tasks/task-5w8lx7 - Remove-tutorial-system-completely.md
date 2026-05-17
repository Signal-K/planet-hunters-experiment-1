---
id: 5w8lx7
title: Remove tutorial system completely
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - cleanup
createdAt: '2026-02-25T11:07:15.949Z'
updatedAt: '2026-02-25T11:31:40.138Z'
timeSpent: 0
assignee: '@me'
---
# Remove tutorial system completely

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User requested full removal of tutorial functionality, UI, persistence, tests, and wiring across app/runtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No tutorial UI/panel/hint nodes remain in shipped scenes
- [x] #2 No tutorial state/sync APIs remain in React Native or Godot bridge
- [x] #3 No tutorial-specific tests or CI steps remain
- [x] #4 Project builds/tests still run for remaining flows
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove tutorial UI assets/wiring in Godot (TutorialPanel/TutorialHintArea scenes, scene instances, reset tutorial controls, transition hide/show hooks).
2. Strip tutorial state from AppController/SyncBridge and RN sync bridge/types/screens (remove tutorialCompleted key and related APIs).
3. Remove tutorial hint calls across gameplay scripts and keep gameplay flow functional without onboarding gates.
4. Delete tutorial-specific tests/CI invocation; update remaining tests expecting tutorialCompleted.
5. Run targeted checks (TypeScript tests + Godot script parse/tests where feasible), then verify no tutorial refs remain outside historical docs/knowns metadata.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed tutorial scenes/scripts/wiring/state from runtime; removed tutorial CI test hook; updated RN sync/UI/tests; verified no tutorial refs in non-doc code via rg and passed npm run test:unit -- __tests__/syncState.test.ts.

; Also removed remaining tutorial mentions from markdown docs/test descriptions; final repo grep (excluding .git/.knowns/.godot) has zero tutorial matches.
<!-- SECTION:NOTES:END -->

