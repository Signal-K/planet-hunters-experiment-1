---
title: Target System
createdAt: '2026-03-16T10:50:39.200Z'
updatedAt: '2026-03-16T10:51:16.785Z'
description: >-
  Specification for mining targets: asteroids vs planets, capacity, depletion
  rules, mining laser levels, procedural generation, and building on targets
tags:
  - spec
  - targets
  - asteroids
  - planets
  - mining
  - game-design
---
# Target System Specification

**Status:** Active  
**Last updated:** 2026-03-16

---

## Overview

Targets are the celestial objects players visit on missions: asteroids, planets, and eventually anything else (moons, comets, etc.). Each target has a resource allotment, capacity, and depletion state. Targets exist in two categories: **known** (already in catalog) and **candidates** (unconfirmed, discovered by scanning).

---

## Target Types

| Type | Source | Unlock Level | Distance Range |
|------|--------|--------------|----------------|
| Asteroid (close) | Predefined catalog | L1 | 3–24 AU |
| Asteroid (far) | Predefined catalog / player discovery | L2 | 24+ AU |
| Planet (TESS candidate / confirmed) | TESS dataset / predefined catalog | L2 | 120–340 AU |

- Known targets include confirmed planets (e.g. Kepler-22b) and known asteroids from predefined lists.
- Candidate targets come from the TESS dataset (TIC IDs) and require classification before a visit can be committed.
- Players get an **XP boost + affinity boost** for discovering a target (classifying a previously-unknown candidate as real). Visiting known targets does not grant this bonus.

---

## Target Capacity

- Each target has a finite total resource allotment.
- **Planets** have 5–20× the capacity of the largest asteroids (scale varies by planet size).
- A "depleted" target means the current mining laser level cannot extract more — **not** that all resources are gone.

---

## Mining Laser Levels & Access

| Laser Level | Effect |
|-------------|--------|
| Level 1 | Access to surface materials; limited extraction volume |
| Level 2+ | Deeper extraction; more of the total allotment extractable |
| High levels | Unlocks hardest/rarest materials; targets previously "depleted" become mineable again |

- A stronger laser does **not** grant faster extraction — it grants access to deeper/harder material tiers.
- A target listed as "depleted" for laser level N can still be visited and can be mined again with laser level N+1.

---

## Depletion Rules

- Targets are never permanently stripped. Depletion is always laser-level relative.
- "Depleted" label = cannot mine further at current laser level.
- Players can still visit, build on, or travel through a depleted target.
- Depletion status is per-player (your extractions don't block others).

---

## Building on Targets

- Players can build structures at any target they have visited, regardless of depletion status.
- Structures on-site enable: on-site refining, in-situ refuelling, relay functions, research.
- See @doc/game-design/construction-and-settlements for full construction mechanics.

---

## Candidate vs. Known Targets

| | Known Target | Candidate (Unconfirmed) |
|--|---|---|
| Requires classification | No | Yes (via scanner) |
| Can be visited immediately | Yes | No — must annotate first |
| XP on discovery | No | Yes (if confirmed) |
| Failed classification | N/A | Flat XP reward, pick new target |

---

## Procedural Generation

- Each target has a unique visual appearance (both aesthetic and mechanical differentiation).
- Terrain uniqueness per target: players should feel they're somewhere new, and different zones have different mineral compositions.
- Simple landmark labels mark distinct zones on a target.
- Proc-gen narrative hooks during mining (e.g. finding artefacts): **deferred — revisit 2026-03-30**.

### Artefacts (Minimal Setup)
- Players can encounter non-organic artefacts or objects of interest during mining.
- Broader narrative / alien/ET artefacts: future, several sprints away.

---

## Multiple Rockets / Simultaneous Missions

- Players can have multiple rockets active simultaneously on different missions.
- Each rocket can only mine one target at a time (mining is an active minigame, not passive).
- Multiple missions can run in parallel as long as the player manages each active mining session.

---

## Shared World Discoveries

- All discoveries are shared across the playerbase.
- Any target discovered in Planet Hunters can be mined by any player.
- Long-term: discoveries from all parts of the Star Sailors ecosystem will cross-pollinate.

---

## Related Docs
- @doc/game-design/economy-and-minerals
- @doc/game-design/construction-and-settlements
- @doc/specs/target-procedural-generation-signature
- @doc/game-design/user-flow-and-citizen-science
