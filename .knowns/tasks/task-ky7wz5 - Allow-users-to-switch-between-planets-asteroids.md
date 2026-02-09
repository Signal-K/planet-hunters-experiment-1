---
id: ky7wz5
title: Allow users to switch between planets & asteroids
status: done
priority: high
labels:
  - Supabase
  - Database
  - Planets
  - UI
  - Anomalies
createdAt: '2026-01-19T08:58:20.676Z'
updatedAt: '2026-02-09T01:36:14.300Z'
timeSpent: 506
assignee: '@me'
---
# Allow users to switch between planets & asteroids

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review planet vs asteroid detail/annotation data flow
2. Implement missing planet annotation compatibility in detail tooling
3. Add Godot tests for planet anomaly id normalization + annotation key stability
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Great, that works!\
Now we just need to get the annotation working for planets, too.

✓ Added level-2 planet gate + one-time unlock overlay + auto-focus to planet scan

✓ Level-2 overlay lists unlocks (planet discovery, rockets, subcontractors, mission) and CTA auto-focuses planet scan

✓ Planet annotation IDs now normalize from ticId (not DB row id) and planet-set aliases are supported. Added tests/run_annotation_model_tests.gd (3/3 pass).
<!-- SECTION:NOTES:END -->

