---
title: Economy and Minerals
createdAt: '2026-03-16T10:49:33.551Z'
updatedAt: '2026-03-17T06:46:17.161Z'
description: >-
  Specification for the mineral economy: market pricing, sell mechanics,
  contractor bonus, construction costs, and Francs usage
tags:
  - spec
  - economy
  - minerals
  - market
  - francs
---
# Economy and Minerals Specification

**Status:** Active  
**Last updated:** 2026-03-16

---

## Overview

Planet Hunters uses a single currency (Francs) with a mineral-based economy. Players earn Francs by completing contractor missions or selling minerals on the open market, and spend them on rockets, upgrades, and construction.

---

## Francs

- Primary in-game currency.
- **Siloed to Planet Hunters** — not shared with other Star Sailors ecosystem games.
- Earned from: contractor mission payouts, selling minerals on market, discovery/annotation bonuses.
- Spent on: rockets, rocket upgrades, room upgrades, structures, construction materials.

---

## Mineral Sources

- Mined from asteroid and planet targets via the mining minigame.
- Mining laser level determines: how much of a target's total allotment can be extracted, and which materials are accessible (stronger laser unlocks harder/rarer materials).
- Cargo bay capacity limits how much can be transported per mission.

---

## Pricing Structure

### Base Market Price
- The "market price" is the reference value for a mineral.
- Fluctuates based on supply (more you sell → price dips).
- Visible to player at **Level 5** via the Marketplace.

### Sell to Market (Open Market)
- Yields ~**80% of market price** for raw, unrefined minerals.
- Selling excess minerals repeatedly causes market price to dip.
- Allows players to time sales strategically (visible after L5).

### Sell to Contractor (Mission Fulfillment)
- Contractors pay ~**20% above base market price** for minerals they need for their project.
- This creates a meaningful incentive to work contractor orders vs. free-selling.
- Affinity bonus adds additional percentage on top (see @doc/game-design/contractor-system).

### Construction Discount
- If a player sells unsold, unrefined minerals toward building a structure:
  - They receive a **15% discount** on the structure cost (based on market price of those minerals).
  - Only applies if those minerals are part of the structure's material makeup.

---

## Marketplace

- **Unlocks at Level 5.**
- Shows live market prices for all mineral types.
- Allows players to time when they sell or mine certain resources.
- Prices respond to player actions (supply/demand).

---

## Mineral Refinement

- Raw minerals can be sold directly at 80% market value.
- Refined minerals command higher value (exact multiplier TBD).
- Refineries process raw minerals into refined materials.
- Refineries can be built by players at any location (Earth, asteroid, planet).
- Refined minerals on-site remove transport overhead and increase net value.

---

## Mining Laser & Cargo Capacity

| Upgrade | Effect |
|---------|--------|
| Mining Laser level up | Access to harder materials + more of a target's total allotment |
| Cargo Bay upgrade | Larger orders can be accepted and fulfilled |

- If a mission requires more cargo than the player's rocket can carry → player is informed they cannot accept the mission and why.
- Multiple rockets can be active simultaneously; each handles one target at a time (mining is an active minigame, not passive).

---

## Post-Mission Mineral Handling

### Success
- Minerals added to persistent inventory.
- Player can choose to sell to market, use for construction, or hold.

### Mining Failure
- Tutorial: failure message → restart.
- Post-tutorial: partial salvage → restart option with penalty.

---

## Economic Sinks (Current)
- Rockets (purchase + upgrades)
- Room upgrades
- Construction/structures
- (Future) research unlocks

---

## Related Docs
- @doc/game-design/contractor-system
- @doc/game-design/construction-and-settlements
- @doc/game-design/target-system
- task-v7u2n9: Implement persistent mineral inventory and construction manager

## Design Review Round 2 — 2026-03-17

### Refinery Unlock Timeline
- **L6**: Earth-based refineries become available.
- **L7**: Off-world refineries become available (build at asteroids, planets, relay stations).
- Each refinery level upgrade increases capacity and processing performance.
- This pacing ensures raw vs. refined mineral choice doesn't short-circuit the contractor incentive in early game.

### Market Transparency (Pre-L5)
- Players are **blind to market prices** before L5 — intentional friction.
- However: contractor mission payouts are **always shown upfront** before accepting.
- Players have contractor quotes as a pricing signal but no full market visibility until L5.

### Mineral Taxonomy (Short Term)
- Keep it simple in the early game: a small set of distinct mineral types is sufficient.
- Each type needs a meaningful role (contractor wants X, market pays more for Y, construction needs Z).
- Minimum viable taxonomy for contractor strategic depth: ~6–8 meaningfully distinct types.

### Mineral Taxonomy (Long Term)
- Full periodic-table-style mineral dictionary: planned for ~3 sprints from 2026-03-17 (~2026-04-07).
- See task-uh20rm: Periodic table mineral dictionary.
- The taxonomy will define: mineral type, rarity tier, economic roles, contractor demand, construction use.

### Construction Conversion (Simplified Early Path)
- Players can sell minerals to get a structure built (essentially a mineral-to-structure conversion).
- The cheapest route is always to refine and craft yourself.
- Direct conversion is available so players aren't forced into crafting before the game introduces it.

## Design Round 3 — 2026-03-17

### Loan System (Q12)
- **Bankruptcy escape valve**: low-interest loan system.
- Available when Francs balance is insufficient to purchase a rocket or start a mission.
- Loan amount: covers one basic mission.
- Interest rate: very low (exact rate TBD — balance task created).
- Loan auto-repaid from next mission payout.
- Prevents softlock. Starting at zero Francs is not a valid game state.

### Off-World Refinery Operation (Q7 — confirmed)
- At L7 (1 mission cap): visiting an off-world refinery to collect refined goods **uses the single active mission slot** — this competes with contractor missions.
- At L8 (2 mission cap): a dedicated slot can serve the refinery.
- Intentional design: off-world refineries become properly operational at L8.

### Rocket Purchase Flow (Q1, Q11 — codebase confirmed)
- `RocketsManager.get_trip_purchase_cost()` handles per-mission rocket cost.
- Players pay per trip, not per ownership — no stockpiling.
- Purchase is integrated into the launchpad/mission start flow.
