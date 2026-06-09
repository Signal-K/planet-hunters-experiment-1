# Landnam Seed Bible v0

## Overview

This document defines the first authored seed set for Landnam: contractors, minerals, market prices, starter rockets, structures, target bands, and mission templates. Everything here matches the portrait-first operational UI style.

## Seed Catalog Summary

### Contractors (10 slots)

Unlock tiers, project types, mineral preferences, payout/affinity notes, and UI roles are defined in `CONTRACTOR_SLOTS` in `web/lib/data.ts`. The 3 active contractors (Foundry-3, Cryos, Belt Gold) are immediately available at tier 1. The remaining 7 are scaffolded and gated behind unlock tiers 2–3.

### Minerals (8 types)

Each mineral includes: name, symbol, base price, rarity tier, primary construction use, and minimum laser drill tier required for extraction. Rarity tiers: common (Fe, Si, C), uncommon (H2O, Ni, Co), rare (Au), exotic (Xe).

### Starter Rocket

Default build: Hull MK1 chassis + Ion Drive A1 propulsion + Hand Drill. Cargo capacity 6U, max orbit 5, drill rate 1.

### Structures

5 blueprints in `STRUCTURES`: Launchpad (free, always), Control Base (500M, after M1), Satellite Uplink (1.2B, tier 2), Refinery (800M, tier 2), Vehicle Garage (600M, tier 2). Prices are in-game francs.

### Market Templates

3 templates: Spot Price (1.0x base, 5% volatility), Futures Contract (0.92x, 2% volatility), Bulk Rate (0.85x, 8% volatility). Spot is default.

### Mission Templates

5 templates mapping to mission tags: STARTER, BULK, PROSPECT, COMMAND, SCIENCE. Each defines cargo range, drill tier min, orbit max, and payout multiplier.

## Config JSON vs Schema Work

| Data | Can live in config JSON | Needs schema work |
|------|------------------------|-------------------|
| Contractor display data (name, color, initial) | Yes — static config | No |
| Contractor unlock tier, project type, mineral prefs | Yes — static config | No |
| Mineral meta (name, sym, color, price, rarity) | Yes — static config | No |
| Mineral construction use, laser access | Yes — static config | No |
| Starter rocket defaults | Yes — static config | No |
| Structure blueprints | Yes — static config | No |
| Market templates | Yes — static config | No |
| Mission templates | Yes — static config | No |
| Contractor payout/affinity rates | Yes — static config | No |
| Per-instance contractor affinity tracking | No — runtime state | Yes: affinity table in PocketBase |
| Per-instance structure placement | No — runtime state | Yes: already in game_states JSON |
| Player progress / missions done | No — runtime state | Already in game_states JSON |
| Economy pricing perturbations | Partial — base rate in config | Yes: market events table if dynamic pricing needed |
| Contractor identity (name, color, initial) | Yes — static config | No — purely cosmetic, no schema needed |
| Mission unlock conditions | Yes — static config | No — sequence numbers and unlockAt field suffice |
