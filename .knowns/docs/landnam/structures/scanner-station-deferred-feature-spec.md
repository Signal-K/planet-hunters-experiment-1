---
title: Scanner Station — Deferred Feature Spec
description: Full specification and codebase inventory for the Scanner (Satellite Station) feature — deferred from MVP scope. All relevant design decisions, unlock rules, build costs, and code locations preserved here for future reintroduction.
createdAt: '2026-05-14T10:30:27.619Z'
updatedAt: '2026-05-14T10:31:40.614Z'
tags:
  - project-landnam,doc-kind-spec,scanner,satellite,structures,deferred
---

# Scanner Station — Deferred Feature Spec

> **Status: DEFERRED** — Scanner will not be included in the first release version. This document preserves all design intent, code locations, and game mechanics so the feature can be reintroduced cleanly later.

---

## Design Intent

The Scanner (also called Satellite Station) is a player-buildable structure that unlocks the planet-candidate discovery loop. Players scan for anomalies and then target discovered candidates in future missions.

### Unlock Gate
- Becomes available after completing 3 missions (i.e., after Mission 3)
- Not a prerequisite for M3 — it unlocks *after* the 3-mission tutorial arc

### Build Cost
- 2,000,000,000 Francs (2B F)

### Scan Soft Cooldown
- 120 seconds between scans

### Economic Significance
- Intended as the first major post-tutorial purchase
- Gate keeps L1–L3 players focused on the core mining/mission loop before opening the citizen-science discovery layer

---

## GDScript Code Locations

### Constants (RocketsManager.gd)
- Line 28: `const SCANNER_UNLOCK_COMPLETED_MISSIONS := 3`
- Line 38: `const SCANNER_BUILD_COST := 2000000000`
- Line 39: `const SCANNER_SOFT_COOLDOWN_SECONDS := 120`

### Static Methods (RocketsManager.gd)
- Line 328: `static func get_scanner_build_cost() -> int`
- Line 331: `static func is_scanner_unlocked() -> bool` (checks badge_count or mission_progress_completed)
- Line 369: `static func can_afford_scanner_build(balance: int) -> bool`
- Line 372: `static func get_scanner_soft_cooldown_seconds() -> int`

### State Save/Load (RocketsManager.gd)
- Line 928: `s["scanner_unlocked"] = int(s.get("mission_progress_completed", 0)) >= SCANNER_UNLOCK_COMPLETED_MISSIONS`

### PlayerProfile Fields (PlayerProfile.gd)
- Line 15: `@export var scanner_station_built: bool = false`
- Line 16: `@export var scanner_unlocked: bool = false`
- Lines 35–36: included in `to_dict()` snapshot
- Lines 54–55: populated from snapshot in `from_dict()`

### AppController Integration (AppController.gd)
- Line 316: `rm.set_scanner_station_built(true)` — called in debug_skip_to_mission
- Lines 655–656: `scanner_station_built` and `scanner_unlocked` included in player_state_snapshot

---

## UI / Scene Files

| File | Purpose |
|------|---------|
| `Scenes/UI/SatelliteStationPanel.tscn` | Main scanner station panel scene |
| `Scripts/UI/SatelliteStationPanel.gd` | Panel controller |
| `Scripts/UI/SatelliteStationPanelList.gd` | Candidate list view |
| `Scripts/UI/SatelliteStationPanelDetail.gd` | Individual candidate detail |
| `Scripts/UI/SatelliteStationPanelLoading.gd` | Loading state |
| `Scripts/UI/SatelliteStationPanelData.gd` | Data layer / API bridge |

---

## Design Tensions to Resolve on Reintroduction

1. **Economy doc vs Mission spec conflict**: Economy doc frames scanner as "M3 prerequisite"; authoritative spec says "unlocks after M3 completion." Code uses post-M3 (SCANNER_UNLOCK_COMPLETED_MISSIONS := 3). **Resolution: post-M3 is correct.**
2. **Scanner discovery requirement**: Future design intent is that players must use scanner to discover a planet candidate before targeting it in a mission. Not yet implemented — see task 7z1z11.
3. **Science credibility surface**: Scanner panel is the main citizen-science surface for reviewing planet candidates. Needs MVP-grade framing copy before reintroduction.

---

## Purge Checklist (for the cleanup task)

When removing scanner from the active codebase for the first release:

- [ ] Remove or stub `is_scanner_unlocked()`, `can_afford_scanner_build()`, `get_scanner_build_cost()`, `get_scanner_soft_cooldown_seconds()` from RocketsManager.gd
- [ ] Remove `scanner_station_built` and `scanner_unlocked` from PlayerProfile fields and snapshots
- [ ] Remove scanner state from AppController.gd debug skip and snapshot
- [ ] Hide or remove SatelliteStationPanel from GameNavigationMenu and Earth base
- [ ] Remove scanner unlock check from save/load state (RocketsManager.gd:928)
- [ ] Archive SatelliteStation*.gd scripts (do not delete — preserve for reintroduction)
- [ ] Archive SatelliteStationPanel.tscn
- [ ] Update Economy doc and Mission System Specification to remove scanner references
