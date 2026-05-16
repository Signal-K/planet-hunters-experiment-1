---
project: Experiment 1/Landnam
id: lrhoir
title: Retire asteroid classification flow for next release
status: done
priority: high
labels:
  - project-landnam
  - release-scope
  - planet-hunters
  - citizen-science
createdAt: '2026-04-30T01:02:54.366Z'
updatedAt: '2026-04-30T01:18:51.595Z'
timeSpent: 936
assignee: '@me'
---

[← Back to Index](../INDEX.md)

# Retire asteroid classification flow for next release

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align current release scope with planet-hunting-only gameplay after the tutorial and through Mission 3. Update sprint/docs/tickets and remove asteroid candidate classification/integration paths that conflict with the current planet candidate flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sprint and active planning docs state that Mission 3 and post-tutorial gameplay are planet-hunting only for the upcoming release
- [x] #2 Knowns tasks reflect removal of asteroid classification work from the immediate sprint and capture any follow-up work needed
- [x] #3 Codebase no longer exposes or relies on asteroid candidate classification/integration paths for Mission 3 or Free Operations
- [x] #4 Tests and copy are updated to match the planet-only release scope
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update sprint and mission/citizen-science docs to make the upcoming release planet-hunting only after the tutorial and through Mission 3/Free Ops.
2. Update current sprint tickets and create any follow-up tasks needed for future planet-only integration or deferred asteroid reintroduction.
3. Remove asteroid candidate-classification and scanner/integration paths that conflict with the active planet-candidate flow.
4. Update tests and player-facing copy to match the planet-only release scope.
5. Run relevant tests, then check AC, add notes, stop time, and mark the task done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated sprint and authoritative mission/citizen-science docs to lock the upcoming release to planet hunting only from Mission 3 onward.

Adjusted current tickets for the new scope and created deferred follow-up task xgcipb for any future asteroid-review redesign.

Removed asteroid candidate review from active Mission 3 and Free Ops selection/classification paths by trimming M3 fallback targets to TESS-only, forcing the scanner panel onto the planet-only path, and restricting candidate classification exposure to TESS targets.

Updated copy and targeted tests to match the new contract.

Verification:
- HOME=/tmp/godot45-user /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path ./scene --script res://tests/run_annotation_model_tests.gd
- HOME=/tmp/godot45-user /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path ./scene --script res://tests/run_later_missions_tests.gd
- HOME=/tmp/godot45-user /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path ./scene --script res://tests/run_mission_e2e_flow_tests.gd
<!-- SECTION:NOTES:END -->

