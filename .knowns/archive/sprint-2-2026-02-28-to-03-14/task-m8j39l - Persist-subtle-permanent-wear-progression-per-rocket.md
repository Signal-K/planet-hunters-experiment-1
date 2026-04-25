---
id: m8j39l
title: Persist subtle permanent wear progression per rocket
status: done
priority: high
labels:
  - gameplay
  - visual-state
  - rockets
  - art-direction
createdAt: '2026-03-10T06:14:50.641Z'
updatedAt: '2026-03-10T06:54:05.476Z'
timeSpent: 879
assignee: '@me'
---
# Persist subtle permanent wear progression per rocket

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track and apply subtle long-term wear state by rocket across missions so visual progression is permanent per rocket.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Wear state is stored per rocket and persists across runs
- [x] #2 Wear visuals remain subtle and do not reduce interactable readability
- [x] #3 Wear can coexist with per-mission contractor theming overlays
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add per-rocket wear persistence model in Rockets state/manager APIs.
2. Increment wear on mission usage and archive wear when rocket is retired (scrap/salvage/destroyed).
3. Validate state behavior with tests/checks and close task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added per-rocket wear persistence (`rocket_wear`) and archival (`archived_rocket_wear`) in state defaults/migrations.
- Increment wear on mission return; include wear points/tier in returned mission payload for downstream visuals.
- Archive wear on retirement flows (`destroyed` / `scrap` / `salvage`) with reason and timestamp.
- Contractor selection cycle now resets per mission scan cycle, so wear/coating/theming can coexist without stale contract carry-over.

## Verification
- Mission E2E, Narrative, and Structure suites pass.
<!-- SECTION:NOTES:END -->

