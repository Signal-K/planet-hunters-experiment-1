---
title: Unified Room Image Generation + Super-Sheet Slicing Plan
createdAt: '2026-03-10T08:53:58.602Z'
updatedAt: '2026-03-10T08:58:28.924Z'
description: >-
  Single source-of-truth workflow for component-first room art generation using
  ChatGPT super-sheets and deterministic slicing/validation
tags:
  - spec
  - rooms
  - image-generation
  - pipeline
  - chatgpt
  - assets
---
# Unified Room Image Generation + Super-Sheet Slicing Plan

## Purpose
Create one canonical, latest-spec workflow for generating modular rocket interior art with ChatGPT using a super-sheet strategy, then split into many component/background assets deterministically.

This supersedes fragmented prompt/runbook docs for active production.

## Scope Lock (Authoritative)
- Mission progression scope: M1-M4 authored onboarding + Free Operations.
- No authored Mission 5 content.
- Component-first architecture: room background/shell assets are separate from interactive components and state variants.
- Contractor theming is allowed, but must preserve readability and state affordances.

References:
- @doc/specs/mission-system-specification
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10
- @doc/specs/contractor-visual-theming-rules-for-room-prompt-production

## Output Contract (Per Asset)
For each `asset_id` row in a batch JSON:
1. `<asset_id>.png`
2. `<asset_id>.json` sidecar with required schema
3. Optional `<asset_id>.txt` (single-line note only)

Required sidecar keys:
- `asset_id`
- `room_id`
- `component`
- `tier`
- `state`
- `prompt_version`
- `generator`
- `generated_at_utc`
- `image_filename`
- `width`
- `height`
- `notes`

## Super-Sheet Strategy

### Why super-sheet
- Better style consistency from one generation context.
- Fewer manual prompts.
- Deterministic slicing into modular assets.

### Master layout rule
Use one super-sheet per batch with fixed equal cells:
- Cell size: `1024x1024`
- Grid: computed from asset count (`cols x rows`)
- Each cell corresponds to one `asset_id` by index order from batch rows.

Within each cell:
- Components: centered with transparent background.
- Room backgrounds/shells: occupy readable 2:1 composition region inside cell.
- No labels/text baked into image.

### Important constraint
ChatGPT cannot guarantee pixel-perfect atlas packing every run. If grid alignment drifts, regenerate with stricter prompt constraints before slicing.

## ChatGPT Prompt Contract (Super-Sheet)
Use one prompt per batch:

1. "Generate a single PNG super-sheet with exactly `<cols>` columns and `<rows>` rows of equal cells, each cell exactly `1024x1024`."
2. "Each cell corresponds to one asset in the provided ordered list; preserve order exactly left-to-right, top-to-bottom."
3. "Transparent background outside each asset silhouette."
4. "No text, no labels, no UI, no borders, no gutters, no extra padding outside the cell grid."
5. "Gameplay readability first at small size; preserve silhouettes and state cues."
6. "Apply contractor theming only via trims/decals/signage accents."

Attach:
- Style anchor image
- Ordered asset list from batch rows
- Optional contractor theme rules snippet

## Command Plan (Deterministic Split)

Assumptions:
- Batch id: `<batch_id>`
- Super-sheet file: `scene/assets/Rooms/generated/<batch_id>/supersheet.png`
- Working directory: repo root
- `magick` (ImageMagick) is installed

### 1) Prepare output folders
```bash
mkdir -p scene/assets/Rooms/generated/<batch_id>/{tiles,final}
```

### 2) Compute grid dimensions from batch size
```bash
node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync("scene/assets/Rooms/checklists/batches/<batch_id>.json","utf8"));const n=b.rows.length;const cols=Math.ceil(Math.sqrt(n));const rows=Math.ceil(n/cols);console.log(JSON.stringify({n,cols,rows}));'
```

### 3) Slice super-sheet into equal cells
```bash
magick scene/assets/Rooms/generated/<batch_id>/supersheet.png \
  -crop <cols>x<rows>@ +repage \
  scene/assets/Rooms/generated/<batch_id>/tiles/tile_%05d.png
```

### 4) Rename cells to `asset_id`
```bash
node -e 'const fs=require("fs"),path=require("path");const batch="<batch_id>";const base=`scene/assets/Rooms/generated/${batch}`;const rows=JSON.parse(fs.readFileSync(`scene/assets/Rooms/checklists/batches/${batch}.json`,"utf8")).rows;rows.forEach((r,i)=>{const src=path.join(base,"tiles",`tile_${String(i).padStart(5,"0")}.png`);const dst=path.join(base,"final",`${r.asset_id}.png`);if(!fs.existsSync(src)) throw new Error(`missing ${src}`);fs.copyFileSync(src,dst);});console.log(`renamed ${rows.length} files`);'
```

### 5) Optional trim for components only (keep room composites untrimmed)
```bash
node -e 'const fs=require("fs"),cp=require("child_process");const batch="<batch_id>";const b=JSON.parse(fs.readFileSync(`scene/assets/Rooms/checklists/batches/${batch}.json`,"utf8"));for (const r of b.rows){if(r.asset_type!=="component") continue;const p=`scene/assets/Rooms/generated/${batch}/final/${r.asset_id}.png`;cp.execSync(`magick "${p}" -trim +repage "${p}"`);}console.log("trim complete");'
```

### 6) Generate required JSON sidecars from batch metadata
```bash
node -e 'const fs=require("fs"),cp=require("child_process"),path=require("path");const batch="<batch_id>";const out=`scene/assets/Rooms/generated/${batch}/final`;const b=JSON.parse(fs.readFileSync(`scene/assets/Rooms/checklists/batches/${batch}.json`,"utf8"));for(const r of b.rows){const img=path.join(out,`${r.asset_id}.png`);const size=cp.execSync(`magick identify -format "%w %h" "${img}"`).toString().trim().split(/\s+/);const sidecar={asset_id:r.asset_id,room_id:r.room_id,component:r.component_id,tier:String(r.tier),state:r.state_key,prompt_version:"v1",generator:"chatgpt",generated_at_utc:new Date().toISOString(),image_filename:`${r.asset_id}.png`,width:Number(size[0]||0),height:Number(size[1]||0),notes:""};fs.writeFileSync(path.join(out,`${r.asset_id}.json`),JSON.stringify(sidecar,null,2)+"\\n");}console.log(`sidecars written: ${b.rows.length}`);'
```

### 7) Validate contract
```bash
node scripts/validate_generated_batch_outputs.mjs <batch_id> scene/assets/Rooms/generated/<batch_id>/final
```

## Batch Order (Current)
1. `batch_l1_m1_starterrocket1`
2. `batch_l2_m2_starterrocket2`
3. `batch_l2_m3_starterrocket2`
4. `batch_l3_m4_starterrocket3`
5. `batch_l3_free_ops_starterrocket3`
6. `batch_usage_state_variants_all_rooms`
7. `batch_advanced_rnd_t3_and_future`

## QA Gates
- Exact filename contract (`<asset_id>.png/.json/.txt`).
- No missing assets against batch rows.
- Readability at gameplay scale (128x64 reference).
- Monotonic wear progression for usage-state variants.
- Contractor styling does not hide state affordances.

## Failure Recovery
If super-sheet fails alignment:
1. Reject slicing output.
2. Re-run generation with stricter prompt constraints (equal grid, fixed cells, no gutters, transparent background).
3. Re-slice and re-validate.

## Operational Notes
- Keep one ChatGPT thread per batch for style consistency.
- Do not mix batches in one sheet.
- Use execution packs at `scene/assets/Rooms/checklists/batches/execution/<batch_id>/` for packetized tracking when needed.
