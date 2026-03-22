---
title: Long-Term Features Roadmap
createdAt: '2026-03-16T10:52:26.331Z'
updatedAt: '2026-03-17T03:19:28.882Z'
description: >-
  Catalogue of deferred and future features with revisit dates — not for
  implementation now, but must not be forgotten
tags:
  - spec
  - roadmap
  - deferred
  - future
  - game-design
---
# Long-Term Features Roadmap

**Status:** Reference only — do not implement features listed here until their revisit date
**Last updated:** 2026-03-16

---

## Purpose

This document captures deferred and future features so they are not forgotten. Each entry has a revisit date. Features should be specced properly when their date arrives.

---

## Revisit 2026-03-23

| Feature | Notes |
|---------|-------|
| Room builder UI layout | Grid-based vs. free-form decision needed. See @doc/game-design/rocket-and-room-system |
| Construction placement (grid vs. Crashlands-style) | UX and implementation decision needed. See @doc/game-design/construction-and-settlements |
| Relay station full mechanics | Full implementation spec needed beyond basic outline |

---

## Revisit 2026-03-30

| Feature | Notes |
|---------|-------|
| Characters system | Roles, recruitment, room assignment, visualization. See @doc/game-design/characters-system-deferred |
| Docking mechanics | Ships docking with outposts to offload cargo |
| Building rockets outside Earth | Manufacturing/launching from relay stations or settlements |
| Proc-gen narrative hooks during mining | Artefacts, anomalies encountered mid-mine |
| Custom ship-building from parts | Boosters, engines, shuttles assembled by player |

---

## Future (No Fixed Date)

### Multiplayer & Social
- Real-time discovery sharing: user A rejects candidate, user B disagrees, both revisit → both earn points.
- Community progress indicator ("Planet Hunters have classified X targets together").
- Asteroid/planet discovery cross-pollination across Star Sailors ecosystem.

### Economy & Market
- Mission leaderboard (most missions completed, not most minerals mined).
- Marketplace already planned at L5; long-term: auction mechanics or player-to-player trade TBD.

### Push Notifications (Self-Hosted)
- Rocket reaches destination notification.
- Construction completion notification.
- Contractor has new mission notification.
- **Constraint: Must NOT use external services (e.g. OneSignal). Must be self-hosted.**

### Daily & Seasonal Systems
- Daily missions.
- Seasonal special events (Halloween, events tied to real scientific events like eclipses, launches, discoveries).

### Citizen Science Depth
- Community annotations: two players can see each other's annotations on the same TESS object; consensus factor applies.
- Discovery confirmation flow: notification to player when their classification contributes to a confirmed discovery.
- Long-term data transmission to interested parties (astronomers, research institutions).

### Construction (Advanced)
- Populations at settlements (astronauts, rovers with limited hostile-environment duration).
- Fuel refineries at remote targets (mine → refine → refuel → travel further without returning to Earth).
- Research labs enabling new tech unlocks.

### Progression & Retention
- Rocket customization with visible wear differences between identical models.
- Visible wear in future multiplayer contexts.
- Prestige / legacy system: TBD.
- Larger narrative and ET/alien artefact storyline.

### Navigation
- System Map zoom-out during transit (stylistic — "your discoveries" board with loose astronomical accuracy).
- Star map updates only after mission debrief (not real-time during transit).

### Citizen Science (Advanced)
- Full integration with TESS confirmation pipeline.
- Aggregated player classifications submitted to astronomical databases.
- Real discovery outcomes reflected back to players via in-game notification.

---

## Related Docs
- @doc/game-design/gameplay-vision-20-questions
- @doc/game-design/contractor-system
- @doc/game-design/construction-and-settlements
- @doc/game-design/characters-system-deferred
- @doc/game-design/rocket-and-room-system

## New Deferred Items — 2026-03-17

### Revisit ~2026-04-07 (3 sprints)
| Feature | Notes |
|---------|-------|
| Periodic table mineral dictionary | Full mineral taxonomy: types, rarity tiers, economic roles, contractor demand, construction use. See task-uh20rm |
| Contractor narrative template system | Reusable mission/project/narrative templates. Location always a variable (never hardcoded). |

### Revisit 2026-03-23 (as previously scheduled, adding)
| Feature | Notes |
|---------|-------|
| Room slot UI design | Slot-based (not spatial) layout for non-StarterRocket ships. First slot-choice moment at new ship class. |

### Long-Term (No Fixed Date — adding)
| Feature | Notes |
|---------|-------|
| Minecraft-level component customisation | Granular per-component ship customisation: rooms, panels, boosters, engines. Everything buildable, rebuildable, customisable. |
| Orbital permit system | License tiers limiting satellites/rockets in Earth orbit simultaneously. |
| Scanner range reveal animation | Visual effect showing scan radius expand on star map when scanner range unlocks at L8. |
