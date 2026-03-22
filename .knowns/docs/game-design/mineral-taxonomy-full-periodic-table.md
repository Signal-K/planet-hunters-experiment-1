---
title: Mineral Taxonomy — Full Periodic Table
createdAt: '2026-03-19T01:56:33.847Z'
updatedAt: '2026-03-19T01:57:18.425Z'
description: >-
  Complete mineral taxonomy for Planet Hunters: all 12 mineral types, tiers 1-4,
  economic roles, spawn weights, base prices, unlock levels
tags:
  - spec
  - minerals
  - economy
  - game-design
---
# Mineral Taxonomy — Full Periodic Table

**Status:** Active  
**Implemented in:** `scene/Scripts/Utils/MineralCatalog.gd`  
**Last updated:** 2026-03-19

---

## Overview

Planet Hunters uses a 12-mineral taxonomy organised into 4 rarity tiers. The catalog is the single source of truth: pricing, colours, spawn weights, and unlock levels all derive from `MineralCatalog.gd`.

---

## Tier System

| Tier | Label | Spawn weight | Unlock | In economy now |
|------|-------|-------------|--------|----------------|
| 1 | Common | 40–60 % | L1 | Yes |
| 2 | Uncommon | 20–30 % | L2–3 | Cobalt only |
| 3 | Rare | 8–15 % | L4 | Platinum only |
| 4 | Ultra-rare | 2–6 % | L6–7 | No |

Colour coding: grey (T1) → green (T2) → blue (T3) → purple (T4)

---

## Full Mineral List

### Tier 1 — Common

| Mineral | Symbol | Base price (F/kg) | Spawn weight | Primary use |
|---------|--------|------------------|--------------|-------------|
| Iron | Fe | 5,900,000 | 55 | Structural alloys, construction base |
| Nickel | Ni | 6,000,000 | 48 | Stainless steel, battery cathodes |
| Silicates | SiO₂ | 5,700,000 | 42 | Insulation, glass, radiation shielding |

### Tier 2 — Uncommon

| Mineral | Symbol | Base price (F/kg) | Spawn weight | Primary use |
|---------|--------|------------------|--------------|-------------|
| Cobalt | Co | 6,100,000 | 28 | Li-ion battery cathodes, superalloys |
| Titanium | Ti | 7,200,000 | 22 | Aerospace frames, pressure vessels |
| Magnesium | Mg | 6,800,000 | 20 | Lightweight alloy frames |

### Tier 3 — Rare

| Mineral | Symbol | Base price (F/kg) | Spawn weight | Primary use |
|---------|--------|------------------|--------------|-------------|
| Platinum | Pt | 6,200,000 | 12 | Catalytic converters, fuel cells |
| Palladium | Pd | 9,500,000 | 9 | Hydrogen storage, electronics contacts |
| Gold | Au | 11,000,000 | 8 | Precision electronics, radiation shield |

### Tier 4 — Ultra-rare

| Mineral | Symbol | Base price (F/kg) | Spawn weight | Primary use |
|---------|--------|------------------|--------------|-------------|
| Iridium | Ir | 18,000,000 | 4 | Rocket nozzle liners, extreme-heat parts |
| Osmium | Os | 20,000,000 | 3 | Ballistic shielding, hardening alloys |
| Rhenium | Re | 24,000,000 | 2 | Single-crystal turbine blades |

---

## Contractor Demand

| Contractor | Specialises in | Tier focus |
|------------|---------------|------------|
| SpaceX | Platinum (T3 ×1.18), Cobalt (T2 ×1.08) | T2–T3 |
| Rocketlab | Nickel (T1 ×1.12), Iron (T1 ×1.08) | T1 |
| Astroforge | Cobalt (T2 ×1.20), Silicates (T1 ×1.10) | T1–T2 |
| Swinburne Auto | Iron (T1 ×1.12) | T1 |
| Karman+ | Platinum (T3 ×1.22) | T3 |
| Skybus Transport | Nickel (T1 ×1.15), Silicates (T1 ×1.12) | T1 |

---

## Economy Rollout Plan

- **Now (L1–L4):** Iron, Nickel, Silicates, Cobalt, Platinum
- **L4 introduction:** Palladium, Gold (rare deposits on planet targets)
- **L5 introduction:** Titanium, Magnesium (Marketplace unlocks — price visible)
- **L6 introduction:** Iridium, Osmium (deep asteroid cores, off-world refineries)
- **L7 introduction:** Rhenium (ultra-rare, requires L7 scanner to locate)

---

## Design Notes

- Platinum's base price is intentionally close to T1/T2 prices — its premium comes from contractor bonus multipliers (Karman+ ×1.22) not the raw market price. This rewards contractor-aligned play without making free-market Platinum sales overpowered.
- Silicates is the cheapest mineral but features in the most construction recipes. Players who over-sell it early will face a materials shortage at L5+ construction unlock.
- The spawn weight system means that even at L6 a player will see ~55% Iron. Ultra-rare deposits are meaningful discoveries, not routine finds.

## Related
- `MineralCatalog.gd` — authoritative code implementation
- @doc/game-design/economy-and-minerals
- @doc/game-design/contractor-system
