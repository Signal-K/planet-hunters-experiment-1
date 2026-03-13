# Room Generation Specification

This document consolidates the prompting and generation workflows for spacecraft interior rooms, incorporating benchmark synthesis from Pixel Starships and Out There: Omega.

## Overview
Purpose: Define a component-first generation workflow where each room is assembled from reusable visual parts, with per-run stateful variants for interactive gameplay objects.

## Style Anchor
Generate the style anchor image first. For all subsequent prompts, attach this anchor and specify "match this style exactly."

**Style Anchor Prompt:**
> Side-view cross-section cutaway of a single spacecraft interior room module. Illustrated sci-fi game asset style — clean detailed linework, metallic silver-grey interior walls with visible panel seams and riveted bolts, recessed floor lighting strips, equipment glowing with coloured sci-fi accent lights. Dark background (#0D0B14 deep space purple, near-black). No text, no labels, no UI. The module is a rectangular tile — flat top and bottom edges so it can stack with other modules. Landscape 2:1 ratio. Consistent illustrated style like a mobile space exploration game concept art, similar to how Pixel Starships looks but rendered in a modern illustrated style rather than retro pixel art. Single module only, no rocket exterior visible.

## Generation Pipeline
1. **Shell Kit:** Empty room shell variants (starter, mid, high density).
2. **Component Kit:** Isolated assets for each room (interactive, structural).
3. **State Variants:** Interactive component states (idle, active, cooldown, damaged, depleted, usage-driven wear).
4. **Composition:** Assemble room tiles from shell + components.
5. **Manifest:** Export sprite IDs, anchors, hitboxes, and states for Godot.

## Quality Standards
- Mid-level detail: Readable at 128x64px.
- Side-view cutaway perspective.
- No text, labels, or UI.
- Consistent line weight and color temperature.
- Transparent background (PNG).

## State Model
Clickable gameplay components should have the following states:
- `idle`, `active`, `cooldown`, `damaged`, `depleted`.
- Usage-driven wear (per run):
  - `usage_0_24`: clean
  - `usage_25_49`: mild wear
  - `usage_50_74`: visible heat/scratches
  - `usage_75_99`: heavy wear
  - `usage_100`: near-failure

## Benchmark Synthesis
- **Pixel Starships:** Spatial/state legibility, function-first taxonomy, upgrade readability.
- **Out There: Omega:** Resource/wear legibility, run-risk signaling, ship identity by specialization.

## Batch Index
1. `batch_l1_m1_starterrocket1` (Starter rooms: thruster, reactor, tank, cargo, drill, nav, hull)
2. `batch_l2_m2_starterrocket2` (Adds fusion drive, large tank, lab, comms)
3. `batch_l2_m3_starterrocket2` (Scanner intro focus)
4. `batch_l3_m4_starterrocket3` (Adds drone bay, telescope, broadcast)
5. `batch_l3_free_ops_starterrocket3` (Contractor loop optimization)
6. `batch_advanced_rnd_t3_and_future` (Ion drive, spectral analyzer, etc.)
7. `batch_usage_state_variants_all_rooms` (Polish pass for wear system)

## Contractor Theming
- Applied per mission/rocket.
- Channels: trims, decals, signage, accent lighting.
- Do not reduce interactable readability.

---
*Last Updated: 2026-03-12*
