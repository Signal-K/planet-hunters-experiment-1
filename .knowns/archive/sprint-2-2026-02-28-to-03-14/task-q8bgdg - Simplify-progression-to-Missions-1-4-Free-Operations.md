---
id: q8bgdg
title: Simplify progression to Missions 1-4 + Free Operations
status: done
priority: high
labels:
  - missions
  - free-ops
  - citizen-science
createdAt: '2026-03-10T00:43:50.125Z'
updatedAt: '2026-03-10T01:51:09.564Z'
timeSpent: 3986
assignee: '@me'
---
# Simplify progression to Missions 1-4 + Free Operations

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement approved direction: remove mission 5+ authored progression, keep first four missions as mechanic onboarding, then open free operations with contractor selection per trip and candidate confirmation gating.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission progression caps authored missions at M4 and transitions to Free Operations.
- [x] #2 Contractor selection is required at mission start for every trip.
- [x] #3 Unconfirmed candidate classifications block immediate visit but still reward XP and prompt target reselection.
- [x] #4 Discovery bonus uses 10% + annotation-level scaling and applies once per target.
- [x] #5 Knowns mission/user-flow specs reflect M1-M4 + Free Operations and deferred penalties note.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit current mission/contractor gating in RocketsManager, launchpad UI, debrief, scanner, and tutorial catalog.
2. Cap authored progression at Mission 4 and treat post-M4 as Free Operations using detected targets.
3. Require contractor selection at mission start for every trip and simplify contractor reward handling.
4. Enforce candidate confirmation gating: non-confirming classifications reward XP but block immediate visit until rescanned/reconfirmed; prompt reselection.
5. Apply discovery bonus formula (10% + annotation level) once per target and persist annotation/claim state.
6. Update mission/user-flow Knowns specs and add deferred penalties note.
7. Run focused tests and complete Knowns task AC/status updates.
<!-- SECTION:PLAN:END -->

