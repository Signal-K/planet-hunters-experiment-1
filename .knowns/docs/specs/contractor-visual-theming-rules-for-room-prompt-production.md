---
title: Contractor Visual Theming Rules for Room Prompt Production
createdAt: '2026-03-10T06:13:44.262Z'
updatedAt: '2026-03-10T08:58:01.550Z'
description: Contractor theming constraints referenced by unified super-sheet plan
tags:
  - spec
  - art-direction
  - contractors
  - rooms
  - prompts
---
# Contractor Visual Theming Rules for Room Prompt Production

## Purpose
Define a production-safe contractor theming system that is visibly distinct, readability-first, and compatible with M4 + Free Ops prompt batches.

## Scope
- Applies to room prompt generation and batch QA.
- Applies per mission and per rocket.
- Must preserve core component readability at small sizes.

## Theming Primitives (Allowed)
1. Palette accents (trim lights, panel edge tint, caution stripe hue)
2. Decals/markings (small logos, hull stencils, bay markers)
3. Component trims (console bezels, cable sheath color family)
4. Signage motifs (arrowheads, hazard tags, panel icon family)

## Constraints (Required)
- No heavy recoloring of core silhouettes.
- No text-heavy labels in room art.
- Interactive components remain highest contrast elements.
- Themes cannot hide state cues (idle/active/cooldown/damaged/depleted).

## Readability Rules
- Priority order: gameplay readability > contractor flavor.
- Theme details should stay secondary and sparse.
- At 128x64 readability checks, all interactables must remain obvious.

## Wear/Progression Rules
- Wear progression is subtle.
- Wear memory is permanent per rocket.
- Contractor overlays stack on top of wear without obscuring base state cues.

## Mission Mapping
- M4 assets may include light contractor signature where relevant.
- Free Ops assets should support stronger contractor identity while preserving legibility.

## Prompt Authoring Addendum
Add this clause to contractor-themed prompts:

```text
apply contractor theme through trims/decals/signage only; preserve all gameplay-critical silhouettes and state readability.
```

## Batch Mapping
- `batch_l3_m4_starterrocket3`: baseline planetary-era readability + light contractor cues.
- `batch_l3_free_ops_starterrocket3`: full contractor theming pass for open operations.

## References
- @doc/game-design/room-component-prompt-system-for-rocket-interiors
- @doc/game-design/room-prompt-production-runbook-trimmed-batches-by-level-ship
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10



## Consolidation Status (2026-03-10)

This document remains active for theming constraints and is consumed by
@doc/specs/unified-room-image-generation-super-sheet-slicing-plan
