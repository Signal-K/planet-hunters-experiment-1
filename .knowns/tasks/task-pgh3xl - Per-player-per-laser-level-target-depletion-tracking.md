---
id: pgh3xl
title: Per-player per-laser-level target depletion tracking
status: done
priority: low
labels:
  - project-landnam
  - gameplay
  - mining
  - targets
createdAt: '2026-03-16T17:52:32.773Z'
updatedAt: '2026-03-16T21:38:32.486Z'
timeSpent: 0
assignee: '@me'
---
# Per-player per-laser-level target depletion tracking

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Target system doc: depletion is always laser-level relative and per-player (your extractions don't block others). A target depleted at laser L1 can still be mined at laser L2. Currently targets may use a simple boolean depletion. Need per-player, per-laser-level depletion state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Target depletion state is tracked per player per laser level (not a global boolean)
- [x] #2 'Depleted' label shows only when current laser level cannot extract more; label removed when laser is upgraded
- [x] #3 Visiting a previously-depleted target at higher laser level resumes mining normally
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MiningInventory: is_depleted_for_laser/mark_depleted_for_laser added with JSON-safe int comparison. AsteroidPreview: depletion label shown per laser level. RocketsManager: get/set_laser_level API added (default 1). MECH13-15 pass.
<!-- SECTION:NOTES:END -->

