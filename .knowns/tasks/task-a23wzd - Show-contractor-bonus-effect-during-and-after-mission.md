---
id: a23wzd
title: Show contractor bonus effect during and after mission
status: done
priority: high
labels:
  - project-landnam
  - ux
  - contractors
  - debrief
createdAt: '2026-03-08T02:33:06.619Z'
updatedAt: '2026-03-10T05:42:36.916Z'
timeSpent: 0
---
# Show contractor bonus effect during and after mission

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contractor bonuses (+x% cobalt etc.) are visible at signup but completely silent during the mission and debrief. Players cannot tell if the contractor did anything.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active contractor bonus is shown on the debrief payout breakdown
- [x] #2 Mining scene shows active contractor modifier somewhere visible
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Debrief shows contractor bonus breakdown; mining HUD now resolves selected contractor via SubcontractorManager so active modifier is visible in-run.
<!-- SECTION:NOTES:END -->

