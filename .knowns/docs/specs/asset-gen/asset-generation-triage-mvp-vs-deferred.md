---
title: Asset Generation Triage — MVP vs Deferred
createdAt: '2026-04-22T04:02:37.944Z'
updatedAt: '2026-04-22T04:02:49.109Z'
description: >-
  Separates MVP-required room art batches (M1-M4 + Free Ops) from post-MVP /
  future batches.
tags:
  - assets
  - triage
  - mvp
  - rooms
  - scope
---
# Asset Generation Triage — MVP vs Deferred

**Date:** 2026-04-22  
**Scope:** Room art batches in `scene/assets/Rooms/checklists/batches/`

---

## MVP Batches (M1–M4 + Free Ops)

These cover the active game scope. Generate these when room visuals are needed for testers.

| Batch file | Scope |
|---|---|
| `batch_l1_m1_starterrocket1.csv` | Level 1 / Mission 1 / StarterRocket1 |
| `batch_l2_m2_starterrocket2.csv` | Level 2 / Mission 2 / StarterRocket2 |
| `batch_l2_m3_starterrocket2.csv` | Level 2 / Mission 3 / StarterRocket2 |
| `batch_l3_m4_starterrocket3.csv` | Level 3 / Mission 4 / StarterRocket3 |
| `batch_l3_free_ops_starterrocket3.csv` | Level 3 / Free Operations / StarterRocket3 |

---

## Deferred / Post-MVP

Do not generate these until post-M4 / Free Ops scope is active:

| Batch file | Reason deferred |
|---|---|
| `batch_advanced_rnd_t3_and_future.csv` | Future content (T3+ rooms, post-MVP R&D) |
| `batch_usage_state_variants_all_rooms.csv` | Nice-to-have state variants; not needed for tester distribution |

---

## Blocker Assessment

Room art assets do **NOT** block tester distribution.  
`RoomSpriteAtlas.texture_for_room()` returns `null` when `room_modules_sheet.png` is absent  
(guarded by `has_sheet()` check). The mining scene and room panel degrade gracefully —  
no crash, no broken layout.

**Room art is a polish step, not a gate.** Testers can complete M1-M4 without any room sprites present.
