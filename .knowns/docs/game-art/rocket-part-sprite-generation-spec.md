---
title: Rocket part sprite generation spec
createdAt: '2026-05-04T17:40:00.000Z'
updatedAt: '2026-05-04T17:40:00.000Z'
description: Editable style and workflow brief for procedurally generated rocket-part sprites.
tags:
  - art
  - sprites
  - pipeline
  - rooms
---
# Rocket Part Sprite Generation Spec

## Purpose
This document is the editable source of truth for Python-generated rocket-part sprites. The generation workflow must read this file every time it runs and treat it as the latest art-direction brief.

## Workflow Contract
- The generator must load this document at runtime before drawing any sprite.
- The generator must record the spec path and a content hash in its output manifest.
- If this document changes, the next generation run should reflect the new brief without code changes.

## Output Contract
- Generate one sprite per room/part listed in `scene/Scripts/Utils/RoomCatalog.gd`.
- Output size: `512x512` pixels.
- Background: transparent.
- Framing: centered module/part presentation with consistent padding.
- File naming: use the part's `sprite` id from the catalog, e.g. `basic_thruster_t1.png`.

## Style Direction
- Read as premium sci-fi hardware, not UI icons.
- Use a side-view modular spacecraft language.
- Favor clean silhouettes, strong outer shape readability, and medium-detail internal machinery.
- Use restrained industrial color palettes: gunmetal, graphite, brushed steel, muted cyan, and amber signal accents.
- Preserve a game-ready silhouette at small sizes; detail should support the shape, not overwhelm it.

## Composition Rules
- Keep the main mass of the part between 70% and 82% of the canvas width.
- Build a clear outer shell first, then add a smaller number of internal features.
- Use a subtle top-light and a darker underside so each part feels dimensional.
- Add a small number of emissive accent lights or energy elements that match the part category.
- Avoid floating labels, text, UI, frames, or background scenery.

## Category Motifs
- `propulsion`: nozzles, exhaust bells, vector fins, turbine housings, heat shielding.
- `power`: reactor cores, capacitor banks, coils, shielded conduits, warning glows.
- `fuel`: tanks, manifolds, valves, pressure housings, pipe routing.
- `storage`: crates, clamps, bays, vault doors, latches, reinforced containers.
- `mining`: drills, cutting heads, articulated arms, hoppers, abrasion plates.
- `navigation`: dishes, sensor ribs, optics, targeting heads, antenna structures.
- `hull`: plating, ribs, braces, armour seams, structural reinforcement.
- `science`: sample pods, optics benches, lab canisters, analysis chambers.
- `communication`: relay dishes, mast elements, signal emitters, transmitter blocks.
- `life_support`: filters, tanks, circulation units, habitat pods, environmental modules.

## Tier Language
- Tier 1: simpler, blockier, more rugged, fewer subsystems exposed.
- Tier 2: more refined silhouette, stronger internal structure, more accent lighting.
- Tier 3: more advanced geometry, cleaner integration, richer energy/signaling detail.

## Content Constraints
- No characters.
- No text or numbers.
- No UI chrome.
- No planet, hangar, or starfield backdrops.
- No photoreal gradients; keep the look stylized and game-art friendly.

## Notes For Future Direction
- If you want a different art style, update this document first rather than editing the generator logic.
- If you want category-specific overrides, add them here and keep the generator generic.
