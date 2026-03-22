---
title: Star Map and Navigation
createdAt: '2026-03-17T06:44:38.523Z'
updatedAt: '2026-03-17T06:45:36.168Z'
description: >-
  Star map spec: sector reveal, solar system vs star systems, solar icons,
  personal discoveries layer, social layer
tags:
  - spec
  - star-map
  - navigation
  - game-design
---
# Star Map & Navigation

**Status:** Active — MVP visible post-M1
**Last updated:** 2026-03-17

---

## Overview
The star map is the player's spatial view of the game world. Visible after Mission 1. Shows discovered targets, personal history, and the growing universe the player inhabits. Core identity feature — "this is MY sector."

---

## Map Structure

### Our Solar System
- **Asteroids** are positioned within our solar system.
- Inner solar system is the default starting view.
- Outer solar system and asteroid belt targets unlock with higher level/range.
- Real astronomical positions used where feasible.

### Other Star Systems
- **TESS planet candidates** exist in other star systems (real TIC coordinate data).
- Each star system has a solar/star icon representing the host star.
- Star systems are grouped into sectors (see Sector Reveal below).

### Star/Solar Icons
- Each star system needs a distinct visual icon.
- Icons should reflect real stellar classifications where possible (star type, colour, size).
- Art task: generate icons for all in-scope star systems. See task for solar icon generation.
- Use existing ChatGPT asset pipeline for production.

---

## Sector Reveal System
- Map is divided into sectors.
- Initial state (post-M1): only the immediate Earth solar system is revealed.
- Visiting a target reveals that sector's neighbours.
- Scanner range increase at L8 sweeps additional sectors into view.
- Revealed sectors are persistent — never hidden again once revealed.

---

## Personal Layer
- Personally discovered targets are visually highlighted (distinct from visited-only).
- Player name is attached to personally discovered targets.
- Personal Discoveries Log accessible from the star map.
- Target states: undiscovered | known (in catalog) | visited | personally discovered.

---

## Social Layer (deferred ~2026-04-07)
- Other players' structures visible at shared targets.
- Classification consensus indicators on TESS candidates.

---

## Related Docs
- @doc/game-design/target-system
- @doc/game-design/user-flow-and-citizen-science
- @doc/game-design/level-progression-and-unlocks
