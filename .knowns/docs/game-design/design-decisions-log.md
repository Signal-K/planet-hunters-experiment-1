---
title: Design Decisions Log
createdAt: '2026-03-17T05:30:39.429Z'
updatedAt: '2026-03-17T06:49:09.500Z'
description: >-
  Compact record of all confirmed design decisions — quick context loader, full
  specs live in mechanic docs
tags:
  - decisions
  - reference
  - game-design
  - authoritative
---
# Design Decisions Log

Compact record of confirmed decisions. Full specs in mechanic docs — see @doc/game-design/game-design-docs-index.
**Last updated: 2026-03-17**

---

## Game Identity
- Name: **Star Sailors: Experiment 1** (internal codename: Planet Hunters)
- Platforms: Web, mobile PWA
- Session target: 10–20 min per run (launch → mine → return → debrief)
- Win condition: none — minimal sandbox, scientific contribution milestones
- Target players: Star Sailors users, casual gamers, citizen science enthusiasts

---

## Mission Structure
- M1–M3: fully scripted tutorial
- M4: first free-ops mission (keep target close for soft landing)
- M4 completion → open Free Operations loop
- Contractor panel visible from M1 (even in scripted missions)
- Contractor selected first, then target
- Star map: visible after M1; expands as player discovers
- Mission cap: 1 active (→ 2 at L8); cancel = rocket auto-scrapped

---

## Rocket System
- StarterRocket family (SR1–SR3+): unibody, no room selection
- Non-starter rockets: slot-based room selection on purchase
- Single-use rockets (current build)
- Long-term: Minecraft-level per-component customisation (deferred, see roadmap)

---

## Economy
- Currency: Francs (siloed; XP shared with Star Sailors ecosystem)
- Contractor pay: ~120% of market price for requested minerals
- Open market sell: ~80% of market price
- Contractor payout always shown upfront before accept
- Market prices visible at **L5** only (blind pre-L5)
- Construction: direct Francs conversion always available; refine+craft = cheapest route
- Construction discount: 15% when using own-mined minerals

---

## Level Gates (quick reference)

| Level | Key Unlock |
|-------|------------|
| L1 | SR1, close asteroids (3–24 AU), 3 contractors, star map |
| L2 | SR2, planets, far asteroids, 4 contractors |
| L3 | SR3, all planet bands (needs M3), 6 contractors |
| L4 | 8 contractors, upgrade existing Earth structures |
| L5 | 10 contractors, room upgrades, Marketplace, build new structures |
| L6 | Earth-based refineries |
| L7 | Off-world refineries |
| L8 | Scanner range increase + animation, 2 simultaneous missions |

---

## Contractors
- 3 at L1 → 10 at L5+ (see contractor-system for full tiers)
- 30-min cooldown after 2 consecutive missions with same contractor
- Player always has ≥1 cooldown-free contractor available
- Cooldown UX: calendar/date system preferred
- Affinity: payout multiplier now; future gate for special missions
- Mission templates: reusable components, location always a variable (TESS-driven)

---

## Mining
- Active sidescroll minigame — not passive; player must be present
- Depletion: per laser level, not permanent; visual indicator shown
- Planets: different mineral types + quantities vs asteroids
- Minigame variety: different zone shapes per mineral, solar flare events, puzzle elements
- Laser level = material tier access (not speed)

---

## Construction
- L4: upgrade existing Earth structures
- L5: build new structures (Earth-based)
- L6: Earth-based refineries (each tier upgrade increases capacity + performance)
- L7: off-world refineries
- Grid vs. free-form placement: deferred to 2026-03-23

---

## Retention & Social
- Retention hooks: daily anomalies, building progression, other players at your bases
- Async social: players can visit and interact with your structures at shared targets
- Purely cooperative; no griefing
- Push notifications: self-hosted only (no OneSignal)
- Notifications planned: rocket arrival, construction complete, contractor available

---

## Citizen Science
- Discovery XP bonus: 10% + 1% per annotation level
- Two Free Ops routes: `contract` and `survey`
- Classifications stored permanently in Supabase
- XP covers science scoring (no separate science score)
- Community consensus loop: deferred long-term (see shared-discovery-consensus)

---

## Open Questions
- Round 2: task-1xhoq6 (9 questions, Q10 resolved)
- Round 3: asked 2026-03-17 (see session log)


## Round 3 Updates — 2026-03-17

### Naming (IMPORTANT — Q8)
- "Star Sailors: Experiment 1" is the game name.
- **"Planet Hunters" is the name of a citizen science project within the game** (like Zooniverse's Planet Hunters TESS project). It was never the game name.
- Internal technical keys retain `planet_hunters_` prefix (versioned identifiers — do not change).

### Rocket Economy
- Per-trip purchase: player buys/builds a rocket for every mission — no stockpiling.
- `RocketsManager.get_trip_purchase_cost()` handles this in codebase.
- 20% build discount already implemented.

### Bankruptcy Protection
- Loan system: low-interest, covers one basic mission, auto-repaid from next payout.
- Softlock prevention — zero Francs is not a valid game state.

### Star Map
- Sector-based reveal. Solar system = asteroids. Other star systems = TESS planets.
- Solar/star icons needed per host star (art task).
- Personal discoveries log accessible from star map, visible Day 1.

### Social/Multiplayer
- MVP: classification consensus notifications (backed up / challenged).
- Full multiplayer expansion: deferred to ~2026-04-07.

### Contractor UX
- Job board layout (all missions visible simultaneously).
- Mission generation: hybrid procedural + AI (Claude Haiku) from templates.
- Location always variable from TESS/asteroid feed.

### Earth Base
- Visually grows as player builds — described as "extremely important".
- Each structure has sprites across upgrade tiers.

### XP Curve
- Tutorial (M1–M4) → L3. Progressive slowdown after. Proposed curve in level-progression-and-unlocks doc.

### Free-Launch Missions
- Full autonomy mode for personal building, exploration. Not just "lower payout selling".

### Time System
- Cooldowns: real-world time, accelerated. Different missions = different in-game durations.

### New-Mechanic Tutorial
- First time a new mission type is attempted: inline tutorial overlay (universal post-M4 pattern).
