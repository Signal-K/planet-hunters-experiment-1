---
id: 89bn4r
title: Fix confusing narrative/UI states and overlapping elements
status: done
priority: high
labels:
  - project-landnam
  - ux
  - ui
  - narrative
  - onboarding
createdAt: '2026-03-06T01:55:30.255Z'
updatedAt: '2026-03-06T03:52:37.923Z'
timeSpent: 65
assignee: '@me'
---
# Fix confusing narrative/UI states and overlapping elements

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address player-facing clarity issues surfaced in playthrough analysis: ambiguous launch blockers, unclear narrative transitions, and UI elements that visually collide. Keep mission progression mechanics intact while improving affordances and feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Players receive clear in-UI reason and next action when launch is blocked
- [x] #2 Mission/tutorial narrative prompts are concise and unambiguous at each step
- [x] #3 No critical HUD/action elements overlap in launch/debrief/transit flows at supported viewport sizes
- [x] #4 Existing tutorial/mission narrative tests continue to pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enforce mission-stage rocket visibility in Launchpad rocket selector (M1 only starterrocket1).
2. Reconcile Mission 1 contractor tutorial step whenever starter contractor is already selected.
3. Restrict tutorial target for contractor action to sign-contractor UI and suppress incorrect fallback highlights.
4. Run tutorial + mission narrative headless tests and record results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: Godot headless suites passed (tutorial, mission_e2e_flow, narrative_paths). Playwright suite passed (28/28).

🔄 Follow-up fix: auto-reconcile Mission 1 contractor tutorial step when starter contractor is already selected in persisted state (prevents stale Sign Contractor prompt and wrong highlight target).

Validation rerun after follow-up: run_tutorial_tests + run_narrative_paths_tests all passing.

🔄 Follow-up fix: M1 rocket selector now hard-gates to starterrocket1; contractor tutorial targeting now sign-button only; fallback tutorial recording path added when AppController is unavailable.

Validation rerun: run_tutorial_tests (7/7), run_narrative_paths_tests (13/13), run_mission_e2e_flow_tests (3/3).

🔄 Follow-up fix #2: Effective mission stage now follows active tutorial stage (when stage 1). Launchpad enforces contractor-first and RocketSelector enforces starterrocket1-only in guided M1, even on progressed saves.

🔄 Follow-up fix #3: After starter contractor selection, Launchpad now collapses contractor list to signed-contractor summary only so rocket creation remains unobstructed.

Validation rerun: run_tutorial_tests 7/7, run_narrative_paths_tests 13/13, run_mission_e2e_flow_tests 3/3.

Validation rerun: run_tutorial_tests 7/7, run_mission_e2e_flow_tests 3/3 (sequential).
<!-- SECTION:NOTES:END -->

