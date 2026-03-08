---
title: Room Prompt Production Runbook (Trimmed Batches by Level + Ship)
createdAt: '2026-03-07T01:42:05.643Z'
updatedAt: '2026-03-07T01:42:32.855Z'
description: >-
  Ordered, formatted prompt batch execution plan using generated checklist
  artifacts for each mission level and rocket type
---
# Room Prompt Production Runbook (Trimmed Batches by Level + Ship)

Purpose: provide formatted, ordered prompt lists and execution sequence for all active ship types and mission levels.

Related:
- @doc/game-design/room-component-prompt-system-for-rocket-interiors
- @doc/game-design/ship-room-benchmark-synthesis-pixel-starships-out-there-omega

Generated assets/checklists:
- `scene/assets/Rooms/checklists/room_component_asset_checklist.json`
- `scene/assets/Rooms/checklists/room_component_asset_checklist.csv`
- `scene/assets/Rooms/checklists/batches/index.md`

## Batch Index (Generated)

The following trimmed batches are generated and ready:

1. `batch_l1_m1_starterrocket1` (165 assets)
2. `batch_l2_m2_starterrocket2` (263 assets)
3. `batch_l2_m3_starterrocket2` (284 assets)
4. `batch_l3_m4_starterrocket3` (365 assets)
5. `batch_l3_m5_starterrocket3` (428 assets)
6. `batch_advanced_rnd_t3_and_future` (148 assets)
7. `batch_usage_state_variants_all_rooms` (165 assets)

Location:
- `scene/assets/Rooms/checklists/batches/*.json`
- `scene/assets/Rooms/checklists/batches/*.csv`
- `scene/assets/Rooms/checklists/batches/*.md`

## Ordered Execution Plan

Global rule (always first):
1. Generate `style_anchor_v1`.
2. Generate `shell_kit_starter_v1`, `shell_kit_mid_v1`, `shell_kit_high_v1`.
3. For each mission batch: generate in this order:
   - interactive base components (p0)
   - structural components (p1)
   - non-usage state variants (idle/active/cooldown/damaged/depleted)
   - room composites
4. Defer `usage_*` variants to final polish pass.

## Level + Ship Mapping

### L1 / M1 / StarterRocket1
Use `batch_l1_m1_starterrocket1`.

Room scope:
- `basic_thruster_t1`
- `small_reactor_t1`
- `small_tank_t1`
- `cargo_bay_t1`
- `mining_drill_t1`
- `basic_nav_t1`
- `basic_hull_t1`

Goal:
- Establish baseline interior zoom readability and core loop interactions.

### L2 / M2 / StarterRocket2
Use `batch_l2_m2_starterrocket2`.

Delta rooms added:
- `fusion_drive_t2`
- `large_tank_t2`
- `sample_lab_t2`
- `comms_relay_t1`

Goal:
- Communicate upgrade jump (denser systems, stronger energy signatures).

### L2 / M3 / StarterRocket2 + Scanner Intro
Use `batch_l2_m3_starterrocket2`.

Delta emphasis:
- Adds `scanner_array_t2` prep prompts to support scanner-introduction narrative.

Goal:
- Make navigation/scanning state cues explicit at scanner unlock moment.

### L3 / M4 / StarterRocket3
Use `batch_l3_m4_starterrocket3`.

Delta rooms added:
- `scanner_array_t2`
- `drone_bay_t2`
- `telescope_t2`
- `broadcast_array_t2`

Goal:
- Full planetary-era interior language with richer technical rooms.

### L3 / M5 / StarterRocket3 Contractor Loop
Use `batch_l3_m5_starterrocket3`.

Delta rooms included for optimization-phase visuals:
- `resource_vault_t2`
- `power_capacitor_t2`
- `subsurface_probe_t2`

Goal:
- Add late-loop optimization and risk/readiness cues.

## Future + Polish Packs

### Advanced R&D coverage
Use `batch_advanced_rnd_t3_and_future`.

Includes:
- `ion_drive_t3`
- `spectral_analyser_t3`
- `subsurface_probe_t2`
- `resource_vault_t2`
- `power_capacitor_t2`
- `fusion_reactor_t2`
- `ablative_armour_t3`

### Usage wear pass (all rooms)
Use `batch_usage_state_variants_all_rooms`.

Goal:
- Implement per-run visual change system after core component sets are approved.

## Formatted Prompt List Access

Each batch has a preformatted ordered markdown list:
- `scene/assets/Rooms/checklists/batches/<batch_id>.md`

Each batch also has machine-readable exports:
- JSON for pipeline tooling
- CSV for tracking/review/outsourcing

## Suggested Daily Production Cadence

1. Day 1: `batch_l1_m1_starterrocket1`
2. Day 2: `batch_l2_m2_starterrocket2`
3. Day 3: `batch_l2_m3_starterrocket2`
4. Day 4: `batch_l3_m4_starterrocket3`
5. Day 5: `batch_l3_m5_starterrocket3`
6. Day 6: `batch_advanced_rnd_t3_and_future`
7. Day 7: `batch_usage_state_variants_all_rooms`

## Open Gaps To Ticket

- Add missing prompt coverage for `reinforced_hull_t2`.
- Add prompt coverage for `life_support_t3`.
- Add prompt coverage for `crew_quarters_t3`.
- Add ingestion tooling to map generated files to Godot runtime state keys.

