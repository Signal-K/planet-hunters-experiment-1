---
title: 'Mission Ideas & Future Missions — Deferred Spec'
description: All mission ideas beyond the 3-mission v1 arc — M4+, free ops variants, future authored missions. Remove non-v1 code, preserve ideas here.
createdAt: '2026-05-14T10:36:15.855Z'
updatedAt: '2026-05-14T10:36:15.855Z'
tags:
  - project-landnam
  - doc-kind-spec
  - missions
  - m4
  - deferred
  - game-design
---

# Mission Ideas & Future Missions — Deferred Spec

> **Status: DEFERRED** — The first version has exactly 3 authored missions (M1, M2, M3) plus Free Operations (repeatable missions after tutorial completion). Everything else is preserved here and removed from active codebase.

---

## V1 Mission Structure (Authoritative)

| Mission | Name | Goal |
|---------|------|------|
| M1 | Asteroid Mineral Run | Mine an asteroid, return with minerals |
| M2 | Upgraded Asteroid Run | Better rocket, better minerals, same asteroid belt |
| M3 | Exoplanet Visit | SR3 rocket, confirmed exoplanet, citizen science classification |
| Free Ops | Repeatable | Post-tutorial loop — variations of M1–M3 with different targets, minerals, difficulties |

Free Ops are not authored missions — they are procedurally varied repeats of the core loop.

---

## Deferred: Mission 4 (Autonomy)

**Original design intent:** First free-ops mission, keep target close for soft landing. Player starts operating independently from contractors.

**Code references to remove:**
- `RocketsManager.gd:52-74` — `PREDEFINED_MISSION_TARGETS[4]` with target `mission-4-autonomy-target`
- `MissionDebriefV2.gd:34` — `XP_BY_MISSION_STAGE[4] = 200` (XP being removed anyway)
- `Design Decisions Log` — "M4: first free-ops mission" entry (add deprecation note)
- Any player-facing copy using "Mission 4"

---

## Deferred: Mission 5+ Ideas

- M5: Deep space target, long-duration mission, new mineral tier
- Multi-planet route missions (pick up from one body, deliver to another)
- Crew missions (Characters system — see characters-system-deferred doc)

---

## Deferred: Free Operations Depth Ideas

- Contractor personality affects available targets and bonus types
- Time-limited contracts with urgency multipliers
- Multi-puzzle missions (`MISSION_GAME_COUNT > 1`) — blocked, see task a3c15z
- Scanner-discovered anomaly required before targeting (see task 7z1z11)
- Classification consensus notifications after sufficient submissions (task 12x898)
- SR3 unlock overlay and flow at appropriate gate
- >3 contractors with varied minerals at higher progression

---

## Deferred: Future Mission Types

- Rescue / salvage missions
- Relay satellite deployment
- Multi-hop expedition routes
- Crew-based specialist missions (blocked on Characters system)

---

## Code Purge Checklist (for M4+ cleanup task)

- [ ] Remove `PREDEFINED_MISSION_TARGETS[4]` from `RocketsManager.gd`
- [ ] Remove `mission-4-autonomy-target` from any data or copy references
- [ ] Remove M4 XP stage entry from `MissionDebriefV2.gd` (moot if XP removed)
- [ ] Update `Design Decisions Log` — deprecate M4 entry
- [ ] Audit `RocketsTargeting.gd` for any M4 target selection logic
- [ ] Confirm `get_available_targets()` does not surface M4 targets in Free Ops
