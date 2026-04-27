---
id: fwf2jt
title: Verify live consensus and rewards after production classification fix
status: blocked
priority: high
labels: []
createdAt: '2026-04-12T10:00:25.866Z'
updatedAt: '2026-04-30T01:07:13.407Z'
timeSpent: 0
parent: q1jyo4
---
# Verify live consensus and rewards after production classification fix

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After classification writes are restored in production, run a full live loop and verify that consensus updates and downstream rewards/debrief behavior reflect real submitted data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A live production classification is submitted and visible in the backend
- [ ] #2 Consensus and downstream reward/debrief behavior are verified against live data
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked on applying supabase/migrations/20260413_classifications_authenticated_guest_policy.sql to production. Once live, rerun LiveAnnotationTour.tscn to verify POST/read-back/consensus and debrief reward flow.

2026-04-30 scope update: live verification should cover the planet-candidate classification loop only for the upcoming release.
<!-- SECTION:NOTES:END -->

