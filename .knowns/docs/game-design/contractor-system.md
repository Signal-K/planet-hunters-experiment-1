---
title: Contractor System
createdAt: '2026-03-16T10:49:02.434Z'
updatedAt: '2026-03-19T03:18:08.108Z'
description: >-
  Full specification for contractor mechanics: mission availability, cooldowns,
  reputation, affinity bonuses, and unlock progression
tags:
  - spec
  - contractors
  - economy
  - game-design
---
# Contractor System Specification

**Status:** Active  
**Last updated:** 2026-03-16

---

## Overview

Contractors are NPCs who offer missions to the player. They are the primary source of mission variety and economic reward post-tutorial. Contractors unlock progressively as the player levels up.

---

## Mission Selection Flow

1. Player selects a contractor before committing to a run (required each trip).
2. Contractor must be selected before target selection is unlocked.
3. Unless the contractor specifies a target, the player picks the target they think will best fulfil the mission.
4. By default, transit uses autopilot — no manual route selection required (future consideration flagged).

---

## Contractor Availability & Cooldowns

- Contractors **can run out of missions** to give a player.
- After **2 consecutive missions with the same contractor**, that contractor enters a **30-minute cooldown**.
- During cooldown, the contractor displays: "I don't have any missions for you right now."
- Players must find another contractor or wait.
- Cooldown is per-contractor, not global.
- As long as a contractor has missions, they are available (no permanent lock-out).

---

## Contractor Unlock Progression

| Level | Contractors Available |
|-------|----------------------|
| 1 | 3 |
| 2 | 4 |
| 3 | 6 |
| 4 | 8 |
| 5+ | 10 (all) |

- Completing missions unlocks new contractors.
- Higher-level contractors offer better payouts and more complex mission types.

---

## Reputation & Affinity System

- Each contractor has a **reputation/affinity score** with the player.
- Higher affinity → **increased payout (affinity bonus)** and access to **more missions** from that contractor.
- Affinity bonus is applied to net payout.
- Affinity increases by completing missions successfully for a given contractor.
- Affinity does **not** decrease (relationship is always recoverable as long as contractor has missions).

---

## Contractor Pricing Logic

- Contractors pay approximately **20% above base mineral market price** for minerals needed for their project.
- This creates an incentive to work contractor orders vs. selling freely on the open market.
- Base market price fluctuates (see @doc/game-design/economy-and-minerals).

---

## Mission Types (Current & Planned)

| Type | Description | When Available |
|------|-------------|----------------|
| Resource collection | Deliver X of mineral Y | M1+ |
| Target scouting | Find a specific type of target | Post-M4 |
| Infrastructure | Build simple structure at target | Post-M4 (future) |

---

## Failure Handling

- If a mission fails (e.g. mining minigame failure): salvage option + restart option with penalty.
- Tutorial missions: failure shows failure message, then restart.
- Contractor relationship is unaffected by individual mission failure.

---

## Mission Scope Constraints

- Some missions may only be offered by one specific contractor.
- Some missions may not be profitable (player must evaluate).
- Some missions require researching new rocket parts (e.g. reusable rockets) — long-term.
- Cargo capacity limits which missions can be accepted. If rocket cargo capacity < mission requirement, player is informed why they cannot take the mission.

---

## Contractor Identity

- Contractor identity is scoped **per mission and per rocket** (visual + gameplay context).
- Each contractor has a distinct visual theme (carried through in room art).
- No global lockout based on contractor switching.

---

## Related Docs
- @doc/game-design/economy-and-minerals
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10
- @doc/game-design/mission-system-specification

## Related Tasks
- task-m8v4pj: Implement contractor cooldowns and reputation levels

## Design Review Round 2 — 2026-03-17

### Affinity as Gate (Future)
- At very high affinity levels, contractors unlock **special mission types** not available to other players.
- Special missions may include unique targets, bonus narrative, or exclusive rewards.
- This is a future addition; current affinity is purely additive (payout multiplier).

### Contractor Narrative Template System
- Each contractor has a distinct project, goals, and location context.
- All missions will be generated from reusable template components (narrative, mission type, mineral, reward structure).
- **Location is always a variable** — never hardcoded in templates, since new locations are added daily from TESS data.
- Over time, players learn more about each contractor's goals and aims through mission progression.
- The contractor's project should have a visible progress indicator (e.g. a build log or project phase tracker).

### Contractor UI — Pricing Transparency
- Whenever a mission is accepted from a contractor, the **payout is always shown upfront** (contractor quote).
- Players are never blind to contractor value — the comparison to open market is surfaced in the mission accept UI.
- Each contractor's specialty/project should be visible so players understand why they pay a premium for certain minerals.

### Cooldown UX
- Cooldown framing: open to a calendar/date system approach.
- Countdown visible when contractor is on cooldown: "Back in X minutes."
- The player must always have at least one cooldown-free contractor available at any level (design constraint).

## Design Round 3 — 2026-03-17

### Time System (Q2)
- Contractor cooldowns are based on **real-world time**, accelerated.
- Different missions take different in-game durations; longer transit = more in-game time passes.
- The in-game calendar advances in proportion to real-world time, sped up.
- Exact compression ratio TBD.

### Mission Generation (Q5)
- Hybrid **procedural + AI** generation from reusable templates.
- Location always a variable from live TESS/asteroid feed.
- Full spec: @doc/game-design/contractor-mission-generation

### Job Board UI (Q15)
- Contractor panel uses a **job board** layout: all available missions from all unlocked contractors visible simultaneously.
- Players compare missions and pick from the board.
- Late game (with characters, ~2026-04-07): contractor NPCs gain visual personality.

## Contractor Panel UX — 2026-03-19

### "Wants" Mineral Display
The SubcontractorsPanel now shows a **"Wants: Mineral +X%"** line beneath the contractor's role for every available (unlocked, non-hidden) contractor. This surfaces the contractor's bonus mineral preferences so players can plan their mining target around contractor demand before launching.

- Displayed in gold (`Color(1.0, 0.85, 0.3)`) to visually separate from the standing/role text.
- Lists all minerals where the contractor pays a bonus, e.g. `Wants: Platinum +18%, Cobalt +8%`.
- Hidden contractors and locked contractors do not show this label.
- This aligns with the design constraint (see Design Review Round 2) that *"each contractor's specialty/project should be visible so players understand why they pay a premium for certain minerals."*
