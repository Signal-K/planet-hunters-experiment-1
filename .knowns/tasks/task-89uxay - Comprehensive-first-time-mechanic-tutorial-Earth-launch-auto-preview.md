---
id: 89uxay
title: Comprehensive first-time mechanic tutorial + Earth launch auto-preview
status: done
priority: high
labels:
  - tutorial
  - onboarding
  - rocket-state
createdAt: '2026-02-08T03:14:14.141Z'
updatedAt: '2026-02-08T03:21:41.680Z'
timeSpent: 0
assignee: '@me'
parent: 5zp87f
---
# Comprehensive first-time mechanic tutorial + Earth launch auto-preview

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Explain each mechanic/action once, the first time it is performed, and never repeat it after being recorded. Also auto-transition to preview 5 seconds after any rocket launch from Earth. Keep each explanation to one simple sentence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every key mechanic/action has a one-sentence tutorial explanation shown the first time it is performed
- [x] #2 First-time actions are persisted so explanations are not repeated on subsequent attempts/sessions
- [x] #3 Launching any rocket from Earth auto-transitions to preview scene after 5 seconds
- [x] #4 Tutorial copy is concise and simple (one sentence per mechanic/action)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persistent first-time tutorial action tracking in AppControllerPersistence/AppController (save+load a per-action dictionary in tutorial config, with helper methods to mark/check first-time actions and reset on tutorial reset).
2. Add a reusable in-game tutorial hint text area that shows one simple sentence at a time and can be called from mechanics scripts.
3. Wire first-time mechanic events to the hint system (structure interactions, target selection, launch flow, asteroid preview actions like mine/return-home), ensuring each event records once and does not repeat.
4. Update Earth launch flow: 5 seconds after a successful rocket launch from Earth, auto-set preview target and transition to asteroid preview scene.
5. Add/update tests for tutorial persistence + first-time behavior and run targeted tutorial/experience tests.
<!-- SECTION:PLAN:END -->

