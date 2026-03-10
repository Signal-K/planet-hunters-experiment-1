---
title: ChatGPT Room Asset Generation Execution Spec
createdAt: '2026-03-10T07:09:44.254Z'
updatedAt: '2026-03-10T08:57:31.701Z'
description: >-
  Legacy execution spec; active source of truth is
  specs/unified-room-image-generation-super-sheet-slicing-plan
---
# ChatGPT Room Asset Generation Execution Spec

## Purpose
Provide a strict, repeatable process for generating room assets via ChatGPT with production-ready consistency and zero filename/schema drift.

## Inputs

- Batch source: `scene/assets/Rooms/checklists/batches/*.csv`
- Master checklist: `scene/assets/Rooms/checklists/room_component_asset_checklist.csv`
- Style constraints: @doc/specs/contractor-visual-theming-rules-for-room-prompt-production
## Required Output Contract
For each `asset_id` row, generate exactly these deliverables:
1. `PNG` image (transparent if component requires alpha).
2. `JSON` sidecar with exact schema below.
3. Optional `TXT` generation note (one line only) when fallback choices were made.

### JSON Sidecar Schema (Required Keys)
```json
{
  "asset_id": "string",
  "room_id": "string",
  "component": "string",
  "tier": "string",
  "state": "string",
  "prompt_version": "v1",
  "generator": "chatgpt",
  "generated_at_utc": "ISO-8601",
  "image_filename": "string",
  "width": 0,
  "height": 0,
  "notes": "string"
}
```

## Filename Rules (No Exceptions)
- Image: `<asset_id>.png`
- Sidecar: `<asset_id>.json`
- Note (optional): `<asset_id>.txt`
- No spaces, no uppercase transforms, no extra suffixes (`_final`, `_v2`, etc).

## ChatGPT Prompt Template (Copy/Paste)
Use this exact scaffold for each asset:

```
SYSTEM
You are generating one production game art asset for a 2D rocket interior system.
Output must obey naming and readability constraints exactly.

USER
Generate asset for:
- asset_id: {{asset_id}}
- room_id: {{room_id}}
- component: {{component}}
- tier: {{tier}}
- state: {{state}}
- style_anchor: {{style_anchor}}
- contractor_theme: {{contractor_theme_or_none}}
- wear_level: {{wear_level}}

Hard constraints:
1) Keep interactable silhouette clear at small size.
2) Use subtle wear only; never reduce readability.
3) Flat-shaded style; soft edges; no heavy noise.
4) Preserve safe visual margins for UI overlays.
5) Output one image only for this asset_id.

Return:
- final image
- one JSON sidecar matching required schema
- no extra variants
```

## Readability Rules
- Prioritize legibility over decorative detail.
- Avoid tiny labels/text baked into sprites.
- Preserve high contrast for interactable edges.
- Keep visual density moderate; do not clutter.

## Contractor Theming Rules
- Apply contractor identity as subtle accents, not full recolor.
- Never hide state cues (usage/wear/tier) under theming.
- Theming must remain consistent across all assets in one batch run.

## Wear Rules
- Wear progression must be monotonic across states (clean -> used -> worn).
- Wear can be visible, but must not obscure silhouette or affordance cues.

## QA Checklist (Per Batch)
- [ ] Every `asset_id` has matching PNG + JSON.
- [ ] JSON schema validates for every file.
- [ ] Filename contract has zero violations.
- [ ] No overlap-prone details near edges used by UI controls.
- [ ] State progression is visually ordered and readable.

## Failure Handling
If ChatGPT cannot satisfy a field:
- still produce file names correctly
- set JSON `notes` with one-line reason
- do not skip `asset_id`

## Execution Notes
- Run batches in order: L1/M1 -> L2/M2+M3 -> L3/M4+FreeOps -> usage-variants -> advanced R&D.
- Do not mix batch IDs in one generation thread.
- Keep one ChatGPT thread per batch for style consistency.



## Consolidation Status (2026-03-10)
This document is now reference-only.
Use this active source of truth:\n@doc/specs/unified-room-image-generation-super-sheet-slicing-plan
