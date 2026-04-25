---
id: fzoyb8
title: Set up tutorial & flow for m3
status: done
priority: high
labels:
  - mvp
  - onboarding
  - mission-flow
  - tutorial
  - m3
  - classification
  - scanner
  - map
  - pwa-ready
createdAt: '2026-04-22T04:42:02.985Z'
updatedAt: '2026-04-22T08:00:28.451Z'
timeSpent: 11608
assignee: '@me'
parent: phx002
---
# Set up tutorial & flow for m3

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
So, the annotation mechanic should follow:
1. We introduce the user to what lightcurves & active asteroids (zooniverse.org/projects/orionnau/active-asteroids/classify) are
2. We have a set of anomalies that are downloaded & cached/offline on PWA
3. Mission 3 involves users being given asteroid candidates or lightcurves (from TESS/TIC) to classify
4. Planets will give users new minerals, depending on the period the user provides (as this determines relative distance to parent star). Asteroids will give users water
5. Tutorial involves annotations and then showing the candidate (if the user idnetified it was real) in the map
6. The map needs to be updated to show multiple stars once planets are unlocked
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 3 introduces classification through a short authored tutorial flow before target selection.
- [x] #2 Mission 3 uses cached/offline anomaly or lightcurve candidate data suitable for PWA play.
- [x] #3 Candidate classification affects target reveal/access without blocking mission reward progress.
- [x] #4 Map/scanner UI can represent unlocked planet/candidate context, including multi-star system context where available.
- [x] #5 Sandboxed tests cover M2 to M3 transition, M3 classification tutorial flow, and map/scanner candidate reveal state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect current M3 launch/target/scanner/map/classification code paths and existing tests.
2. Define the M3 authored flow around candidate classification: intro copy, anomaly/lightcurve prompt, result handling, and map reveal.
3. Implement the smallest vertical slice that connects tutorial guidance, candidate data, target reveal/access, and mission progression without introducing open-ops/free-mode language.
4. Add sandboxed Godot tests for M2 -> M3, M3 tutorial/classification, candidate reveal/block/reward behavior, and map/scanner state.
5. Run focused mission/tutorial/map tests and record completion notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Relations: builds on @task-55nk4i. Relevant completed work: @task-9zc5kc, @task-btkvyl, @task-8unidd, @task-12x898. Related blocked/planned work: @task-lkzqm0, @task-srnf59.

✓ Implemented M3 TESS/TIC candidate flow: cached offline targets, classification tutorial step, LaunchWizard classification card, candidate reveal/block semantics, map star-system context.
✓ Fixed base prerequisite card priority so M4 Scanner Station build remains actionable before New Mission.
✓ Tests: later_missions 17/17, mission_e2e 3/3, tutorial 8/8, narrative 13/13, structure 27/27.
<!-- SECTION:NOTES:END -->

