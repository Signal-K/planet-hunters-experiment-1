---
id: m2wlh4
title: Show required rooms for a mission order during rocket building
status: done
priority: high
labels:
  - project-landnam
  - ux
  - onboarding
  - rocket-builder
createdAt: '2026-03-08T02:33:05.659Z'
updatedAt: '2026-03-10T05:42:36.917Z'
timeSpent: 0
---
# Show required rooms for a mission order during rocket building

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players build rockets without knowing which rooms are needed to fulfil the mission order. A player can launch with zero mining capacity and only discover the problem mid-mission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rocket builder shows which room categories are required for the active order
- [x] #2 Invalid/incomplete room configs are flagged before launch (warning, not a hard block)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Launchpad selector now shows Required Rooms checklist (mining/storage) with missing-category warning; launch flow keeps warning-only (non-blocking) room validation.
<!-- SECTION:NOTES:END -->

