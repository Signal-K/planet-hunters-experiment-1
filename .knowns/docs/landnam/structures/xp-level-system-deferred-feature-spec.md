---
title: 'XP & Level System — Deferred Feature Spec'
description: All XP/level ideas, design decisions, and code locations — deferred from v1. Remove from active codebase, reintroduce later.
createdAt: '2026-05-14T10:35:49.352Z'
updatedAt: '2026-05-14T10:35:49.352Z'
tags:
  - project-landnam
  - doc-kind-spec
  - xp
  - levels
  - progression
  - deferred
---

# XP & Level System — Deferred Feature Spec

> **Status: DEFERRED** — XP and levelling are being removed from the first release version. This doc preserves all design intent, code locations, and mechanics so the system can be reintroduced cleanly.

---

## Design Intent (from docs)

### Curve (design doc — `level-progression-and-unlocks.md`)
- L1→L2: 200 XP
- L2→L3: 500 XP
- (Implies escalating curve)

### Curve (actual code — `AppController.gd:721`)
- Formula: `floor(100.0 * pow(1.5, level - 1))`
- L1→L2: 100 XP
- L2→L3: 150 XP
- L3→L4: 225 XP
- L4→L5: 337 XP
- Note: These two curves were never reconciled.

### XP Sources
- Mission debrief: 80 XP (M1), 120 XP (M2), 160 XP (M3), 200 XP (M4), 100 XP (free ops) — `MissionDebriefV2.gd:34`
- Launch: 5 XP — `AppController.gd:45` (`XP_AWARD_LAUNCH`)
- Scan: 2 XP — `AppController.gd:46` (`XP_AWARD_SCAN`)

### Level Unlock Gates
- SR1: always available
- SR2: Level 2
- SR3: Level 3
- Control Station: Mission 2 completion (not level-gated in code)
- Scanner: 3 completed missions

### Design Target
- Tutorial arc (M1–M3) should get player to approximately Level 3

---

## Known Bugs (at time of deferral)

- `_reconcile_experience_level_with_mission_stage()` (`AppController.gd:619-624`) overwrites `experience_level` with `mission_stage` on every `load_experience()` call, discarding accumulated XP.
- XP/level is partially mirrored to `localStorage["planet_hunters_xp_state_v1"]` as a cross-session backup, but this is incomplete.
- `LevelUpNotification.tscn` is added as a child of the AppController autoload (lines 783–785) — z-ordering undefined.
- Multiple XP constants scattered: `XP_AWARD_LAUNCH`, `XP_AWARD_SCAN` in AppController; `XP_BY_MISSION_STAGE` in MissionDebriefV2.

---

## GDScript Code Locations

### AppController.gd
- Line 17: `const DEFAULT_EXPERIENCE_XP := 0`
- Line 18: `const DEFAULT_EXPERIENCE_LEVEL := 1`
- Line 25: `var experience_xp: int`
- Line 26: `var experience_level: int`
- Lines 45–46: `XP_AWARD_LAUNCH`, `XP_AWARD_SCAN` constants
- Lines 556–572: `add_experience()` — XP award + level-up loop
- Lines 580–585: `set_experience_from_react()` — web bridge setter
- Lines 591–604: `get_experience_level()`, `get_total_experience()`
- Lines 607–617: `save_experience()`, `load_experience()` — ConfigFile persistence
- Lines 619–624: `_reconcile_experience_level_with_mission_stage()` — the buggy reconcile
- Lines 633–639: `_emit_experience_updated()` + WebEventBridge emit
- Lines 698–709: `_sync_experience_from_web_storage()`, `_sync_experience_to_web_storage()`, `_clear_web_experience_storage()` — localStorage mirror
- Lines 728–785: `_unlock_rockets_for_level()`, `_show_level_up_notification()` — level-up side effects
- Line 783–785: `LevelUpNotification` instantiated as AppController child

### MissionDebriefV2.gd
- Line 34: `XP_BY_MISSION_STAGE` dict (M1=80, M2=120, M3=160, M4=200, free_ops=100)

### PlayerProfile.gd
- XP and level fields included in snapshot

### SyncBridge.gd
- Lines 63+: `_on_pwa_state_received` applies xp/level from Next.js push

### Persistence
- `user://experience.cfg` — Godot ConfigFile
- `localStorage["planet_hunters_xp_state_v1"]` — partial web mirror

---

## Purge Checklist

- [ ] Remove `experience_xp`, `experience_level`, `DEFAULT_EXPERIENCE_XP`, `DEFAULT_EXPERIENCE_LEVEL` from AppController
- [ ] Remove `add_experience()`, `set_experience_from_react()`, `get_experience_level()`, `get_total_experience()` from AppController
- [ ] Remove `save_experience()`, `load_experience()`, `_reconcile_experience_level_with_mission_stage()` from AppController
- [ ] Remove `_emit_experience_updated()` and the `experience_updated` signal
- [ ] Remove `_sync_experience_from_web_storage/to/clear` web storage mirror methods
- [ ] Remove `_unlock_rockets_for_level()` — rocket unlocks need a replacement gate (mission stage?)
- [ ] Remove `_show_level_up_notification()` and `LevelUpNotification` instantiation
- [ ] Remove `XP_AWARD_LAUNCH`, `XP_AWARD_SCAN` constants
- [ ] Remove XP award calls from `MissionDebriefV2.gd`
- [ ] Remove XP/level from `PlayerProfile` snapshot fields
- [ ] Remove XP application from `SyncBridge._on_pwa_state_received`
- [ ] Remove `user://experience.cfg` persistence path
- [ ] Remove localStorage XP mirror
- [ ] Replace rocket unlock gates with mission-stage-based logic (SR2 after M1, SR3 after M2, or similar — document the new rule)
- [ ] Archive `LevelUpNotification.tscn` (do not delete)
