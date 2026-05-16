---
id: m8v4pj
title: Implement contractor cooldowns and reputation levels
status: done
priority: medium
labels:
  - project-landnam
  - gameplay
  - contractors
createdAt: '2026-03-12T00:00:00.000Z'
updatedAt: '2026-03-16T17:41:51.004Z'
timeSpent: 154
assignee: '@me'
---
# Implement contractor cooldowns and reputation levels

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the contractor system to include cooldowns (they're not always available) and reputation/leveling (more use = better bonuses).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reputation XP awarded after each mission; level/title visible in SubcontractorsPanel
- [x] #2 After 2 consecutive missions with same contractor, 30-min cooldown is triggered
- [x] #3 Contractor on cooldown shows 'Not available' in LaunchpadSelectorPanel, button disabled
- [x] #4 Cooldown countdown visible in SubcontractorsPanel
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add record_mission_completion(sub_id) to SubcontractorManager (rep XP + consecutive tracking + cooldown trigger)
2. Call it from MissionDebrief after add_affinity
3. Show reputation level/title + cooldown in SubcontractorsPanel
4. Disable on-cooldown contractors in LaunchpadSelectorPanel
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SubcontractorManager.record_mission_completion(sub_id): awards 100 rep XP, tracks consecutive use, triggers 30-min cooldown after 2 consecutive missions.
Wired from MissionDebrief._sell() after add_affinity.
SubcontractorsPanel shows reputation level/title + cooldown countdown per card.
LaunchpadSelectorPanel disables on-cooldown contractors with "Not available" + flavour message.
3 new regression tests (MFIX11-13) all pass, 13/13 total.
<!-- SECTION:NOTES:END -->

