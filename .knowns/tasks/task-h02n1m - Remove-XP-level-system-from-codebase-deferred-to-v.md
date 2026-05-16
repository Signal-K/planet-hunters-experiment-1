---
id: h02n1m
title: Remove XP/level system from codebase (deferred to v2)
status: done
priority: high
labels:
  - project-landnam,godot,xp,levels,cleanup,deferred
createdAt: '2026-05-14T10:36:38.213Z'
updatedAt: '2026-05-15T02:21:17.877Z'
timeSpent: 0
---
# Remove XP/level system from codebase (deferred to v2)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
XP and levelling are being cut from v1. Full spec preserved at @doc/landnam/structures/xp-level-system-deferred-feature-spec.

Rocket unlocks currently gate on level (SR2=L2, SR3=L3) — replace with mission-stage gates before removing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No XP award, accumulation, or display code active in any script
- [x] #2 Rocket unlocks gated on mission stage instead of level (SR2 after M1, SR3 after M2 — confirm correct gate with user)
- [x] #3 experience_xp/level removed from PlayerProfile snapshot and SyncBridge
- [x] #4 user://experience.cfg and localStorage XP mirror paths removed
- [x] #5 LevelUpNotification.tscn archived (not deleted)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: XP/level fully removed from AppController, AppControllerPersistence, RocketsManager, PlayerProfile, PlayerManager, EventBus, SyncBridge, MissionDebriefV2, GameplayAnalytics, GameNavigationMenu, SubcontractorsPanel, SpaceMap.

Rocket unlock replacement: ROCKET_UNLOCK_MISSIONS dict (SR1=0, SR2=1 mission, SR3=2 missions). unlock_for_mission_stage() replaces unlock_for_level(). Debrief calls _unlock_rockets_on_mission_complete() after each mission.

Marketplace and room upgrades show 'not available in this version' message (both deferred).

Preferences migrated from user://experience.cfg to user://preferences.cfg with legacy migration path.

LevelUpNotification.tscn still exists on disk (not deleted — archived per spec).
<!-- SECTION:NOTES:END -->

