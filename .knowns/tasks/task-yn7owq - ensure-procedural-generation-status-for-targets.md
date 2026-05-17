---
id: yn7owq
title: Ensure procedural generation status for targets
status: done
priority: medium
labels:
  - project-landnam
  - prodgen
  - procedural
  - generation
  - targets
  - visuals
  - algorithms
  - generator
  - asteroids
  - planets
  - resources
createdAt: '2026-03-03T07:33:45.000Z'
updatedAt: '2026-03-07T01:09:19.857Z'
timeSpent: 126
assignee: '@me'
---
# Ensure procedural generation status for targets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make sure that the makeup of each target is procedurally generated - we shouldn't have the same minerals (quantity) for every target, and we shouldn't have the same terrain, terrain patterns, landmarks on every target. Every target has to be 100% unique.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Resource yield composition varies per target (not just by level/type), including mineable percentage differences
- [x] #2 Terrain silhouette + landmark placement vary per target deterministically from target seed
- [x] #3 Preview/mining context passes per-target generation signature so visuals are stable per target and distinct across targets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add deterministic per-target generation signature in ResourceYield (mineable pct + terrain params).
2. Propagate signature from AsteroidPreview into SidescrollMining session context.
3. Use signature in SidescrollMining terrain + landmark generation (shape profile, rock clustering, landmark bands).
4. Validate uniqueness by sampling multiple targets and documenting evidence in notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added generation_signature in ResourceYield (mineable_pct jitter + terrain params) and returned it with yield payload. ✓ Propagated signature via AsteroidPreview session context into SidescrollMining. ✓ Terrain now consumes signature (roughness, peak/valley chance, height bias, rock cluster count/bias). ✓ Verified deterministic variation across sampled target IDs via headless script.
<!-- SECTION:NOTES:END -->

