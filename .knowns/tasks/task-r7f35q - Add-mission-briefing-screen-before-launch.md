---
id: r7f35q
title: Add mission briefing screen before launch
status: done
priority: medium
labels:
  - project-landnam
  - missions
  - ui
  - briefing
  - onboarding
createdAt: '2026-02-25T08:19:32.287Z'
updatedAt: '2026-02-25T09:54:57.933Z'
timeSpent: 0
assignee: '@me'
---
# Add mission briefing screen before launch

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create pre-launch briefing screen that summarizes mission objectives, requirements, expected rewards, and new mechanics being introduced. See @doc/specs/mission-system-specification for mission details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Briefing screen shows before first launch of each mission
- [x] #2 Displays mission number, objective summary, and key mechanics
- [x] #3 Shows required rocket level and target type
- [x] #4 Displays expected reward ratio and new unlocks
- [x] #5 Can be skipped after first viewing per mission
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persisted mission-briefing seen-state in RocketsManager
2. Add launchpad briefing UI shown on first mission launch only
3. Render mission number/objective/mechanics/requirements/reward/unlocks
4. Add skip/continue behavior and unblock launch after first view
5. Run experience tests and close task
<!-- SECTION:PLAN:END -->

