---
id: lumudz
title: Level 2 mission to require using the new rocket
status: done
priority: medium
labels:
  - project-landnam
  - missions
  - levels
  - mission2
  - level2
  - rockets
  - experience
  - progression
  - narrative
createdAt: '2026-02-18T22:39:16.000Z'
updatedAt: '2026-02-18T14:57:29.882Z'
timeSpent: 0
assignee: '@me'
---
# Level 2 mission to require using the new rocket

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The second mission will force the user to use the l2 starter rocket. There has to be an explanation to the user about this
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enforce Mission 2 target gating to require Starter Rocket 2 at selector and launch validation paths.
2. Add explicit Mission 2 guidance copy explaining the L2 requirement.
3. Add/adjust progression tests for mission-2 requirement messaging/gating.
4. Run headless experience tests and record results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Mission 2 now explicitly explains Starter Rocket 2 (L2) requirement in selector guidance; launch/target gating remains enforced by required level checks. Added regression coverage in run_experience_tests.
<!-- SECTION:NOTES:END -->

