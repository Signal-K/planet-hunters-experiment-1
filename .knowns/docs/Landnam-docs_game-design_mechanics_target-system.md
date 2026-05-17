---
title: Target System
description: 'Specification for mining targets: asteroids vs planets, capacity, depletion rules, mining laser levels, procedural generation, and building on targets'
createdAt: '2026-03-16T10:50:39.200Z'
updatedAt: '2026-05-13T08:07:47.580Z'
tags:
  - project-landnam
  - doc-kind-mechanic
  - spec
  - targets
  - asteroids
  - planets
  - mining
  - game-design
  - mechanics
  - design
---

[← Back to Index](../INDEX.md)

# Target System Specification

**Status:** Active  
**Last updated:** 2026-04-30

---

## Overview

Targets are the celestial objects players visit on missions: asteroids, planets, and eventually anything else. Each target has a resource allotment, capacity, and depletion state. For the upcoming release, the active candidate-review loop is **planet-only** even though the broader target catalog still contains asteroid destinations.

---

## Target Types

| Type | Source | Unlock Level | Distance Range |
|------|--------|--------------|----------------|
| Asteroid (close) | Predefined catalog | L1 | 3–24 AU |
| Asteroid (far) | Predefined catalog / player discovery | L2 | 24+ AU |
| Planet (TESS candidate / confirmed) | TESS dataset / predefined catalog | L2 | 120–340 AU |

- Known targets include confirmed planets and known asteroids from predefined lists.
- Candidate targets in the active release path come from the **TESS dataset** and require classification before a visit can be committed.
- Players get an XP boost + affinity boost for discovering a target (classifying a previously-unknown planet candidate as real).

## Release Scope Lock
- **Planet candidate review is the only active classification mechanic in the next release.**
- Asteroids remain valid destinations and resource targets, but **asteroid candidate review/integration is deferred**.
- Any future asteroid-review return should be designed as a separate mechanic, not assumed to mirror the current planet-candidate flow.

## Target Capacity
- Each target has a finite total resource allotment.
- **Planets** have 5–20× the capacity of the largest asteroids (scale varies by planet size).
- A "depleted" target means the current mining laser level cannot extract more — not that all resources are gone.

## Mining Laser Levels & Access
| Laser Level | Effect |
|-------------|--------|
| Level 1 | Access to surface materials; limited extraction volume |
| Level 2+ | Deeper extraction; more of the total allotment extractable |
| High levels | Unlocks hardest/rarest materials; targets previously "depleted" become mineable again |

## Candidate vs. Known Targets
| | Known Target | Candidate (Unconfirmed) |
|--|---|---|
| Requires classification | No | Yes, for planet candidates via scanner |
| Can be visited immediately | Yes | No — must annotate first |
| XP on discovery | No | Yes (if confirmed) |
| Failed classification | N/A | Flat XP reward, pick new target |

## Procedural Generation
- Each target has a unique visual appearance.
- Terrain uniqueness per target should make every destination feel distinct.
- Proc-gen narrative hooks during mining remain deferred.

## Multiple Rockets / Simultaneous Missions
- Players can have multiple rockets active simultaneously on different missions.
- Each rocket can only mine one target at a time.
- Multiple missions can run in parallel as long as the player manages each active mining session.

## Shared World Discoveries
- All discoveries are shared across the playerbase.
- Any target discovered in Planet Hunters can be mined by any player.
- Long-term: discoveries from all parts of the Star Sailors ecosystem will cross-pollinate.

## Related Docs
- @doc/game-design/economy/economy-and-minerals
- @doc/game-design/missions/user-flow-and-citizen-science
- @doc/game-design/missions/mission-system-specification
