---
title: Target procedural generation signature
createdAt: '2026-03-07T01:09:18.770Z'
updatedAt: '2026-03-07T01:09:44.960Z'
description: Signature-based target uniqueness for mining yields and terrain
tags:
  - spec
  - procedural
  - generation
  - targets
  - mining
---
# Target Procedural Generation Signature

## Objective
Guarantee deterministic uniqueness per target for mining gameplay outputs while preserving reproducibility.

## Current Scope
- Resource yield composition varies by target ID, type, and level.
- Mineable percentage includes deterministic per-target jitter.
- Terrain generation uses per-target signature fields (roughness, peak/valley chance, height bias, landmark clustering).
- Preview passes generation signature into mining session context.

## Signature Fields
- `seed`
- `target_id`
- `target_type`
- `mineable_pct`
- `terrain.roughness`
- `terrain.peak_chance_boost`
- `terrain.valley_chance_boost`
- `terrain.height_bias`
- `terrain.landmark_cluster_bias`
- `terrain.landmark_cluster_count`

## Future Extension
- Add orbital/system metadata to signature input:
  - orbital period
  - parent star class/temperature
  - composition tags
- Increase divergence range for late-game or exotic target classes.
