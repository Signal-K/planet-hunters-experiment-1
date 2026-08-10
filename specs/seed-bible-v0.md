# Landnam Seed Bible v0

## Overview

This document defines the first authored seed set for Landnam: clients, minerals, market prices, Explorer and Prospector vessels, structures, target bands, and mission templates. Everything here matches the portrait-first operational UI style.

## Seed Catalog Summary

### Contractors (10 slots)

Unlock tiers, project types, mineral preferences, payout/affinity notes, and UI roles are defined in `CONTRACTOR_SLOTS` in `web/lib/data.ts`. v0 uses mechanical placeholder identities first: 10 contractor slots at unlock tiers 3/4/6/8/10. Authored names, themes, portraits, and lore are deferred.

### Minerals (8 types)

Each mineral includes: name, symbol, base price, rarity tier, primary construction use, and minimum laser drill tier required for extraction. Rarity tiers: common (Fe, Si, C), uncommon (H2O, Ni, Co), rare (Au), exotic (Xe).

### Starter Rocket

Default build: Hull MK1 chassis + Ion Drive A1 propulsion + Hand Drill. Cargo capacity 6U, max orbit 5, drill rate 1.

### Structures

Current active onboarding structure: Launchpad (free, always). Refinery and Vehicle Garage remain data placeholders for later design.

### Market Templates

3 templates: Spot Price (1.0x base, 5% volatility), Futures Contract (0.92x, 2% volatility), Bulk Rate (0.85x, 8% volatility). Spot is default.

### Mission Templates

Current active onboarding missions are M1 Iron Reserve Order and M2 Silicon Bulk Order. Mission templates can still describe resource-collection tuning, but M3 and later mission rows should not be seeded from older plans.

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
| Contractor placeholder identity (slot name, color, initial) | Yes — static config | No — authored identity pass deferred |
| Mission unlock conditions | Yes — static config | No — sequence numbers and unlockAt field suffice |
