# Asset Pipeline Triage: flrdzf

Date: 2026-06-23

## Scope

Requested paths:

- `public/assets/_generated/`
- `public/assets/ships/`
- `public/assets/ores/`

Repo reality:

- There is no repo-root `public/` directory.
- Runtime web assets live under `web/public/`.
- The matching asset directories are:
  - `web/public/game/assets/ores/`
  - `web/public/game/assets/ships/`
  - `web/public/parts/_generated/`

## Inventory

### `web/public/game/assets/ores/`

Current files:

- `ore_carbon.png`
- `ore_cobalt.png`
- `ore_gold.png`
- `ore_ice.png`
- `ore_iron.png`
- `ore_nickel.png`
- `ore_rare.png`
- `ore_silicon.png`

All are 64x64 PNGs. They are referenced by `web/public/game/assets/manifest.json` and loaded dynamically by `web/components/game/screens/MiningCanvas.tsx` as `/game/assets/ores/ore_${id}.png`.

Issue: `web/lib/data/minerals.ts` now includes minerals without matching ore sprites:

- `copper`
- `aluminium`
- `hydrogen`
- `uranium`

These minerals are used by targets, mission generation, contractors, and structures, so missing `ore_copper.png`, `ore_aluminium.png`, `ore_hydrogen.png`, and `ore_uranium.png` can fall back silently or show missing textures when those mineral IDs reach the mining canvas.

### `web/public/game/assets/ships/`

Current files: none.

Issue: `web/public/game/assets/manifest.json` declares:

- `ship_sr1`: `/game/assets/ships/ship_sr1.png`
- `ship_sr2`: `/game/assets/ships/ship_sr2.png`
- `ship_sr3`: `/game/assets/ships/ship_sr3.png`

Those files do not exist. Current rocket and part UI instead uses `/parts/*.png` through `web/lib/data/parts.ts` and `web/lib/data/rockets.ts`.

### `web/public/parts/_generated/`

Current files:

- `starter_rocket_booster_t1_20260612_114012.png`
- `starter_rocket_main_stage_t1_20260612_015831.png`
- `starter_rocket_main_stage_t1_20260612_020317.png`
- `starter_rocket_main_stage_t1_20260612_114012.png`
- `starter_rocket_parts_t1_20260612_010314.png`
- `starter_rocket_storage_bay_t1_20260612_020317.png`
- `starter_rocket_t1_20260612_002132.png`

These are draft/generated sprite outputs from `tools/sprites/generate_sprite.py`; the script default output is `web/public/parts/_generated`.

Issue: no code references these generated filenames directly. One generated file, `starter_rocket_t1_20260612_002132.png`, is byte-identical to both:

- `web/public/parts/starter_rocket_t1.png`
- `web/public/parts/basic_hull_t1.png`

## Earth Asset Duplicates

Current `earth-*` files:

- `web/public/earth-day.jpg` - 480x320, used by `MissionBoardScreen.tsx`
- `web/public/earth-dusk.png` - 820x547, used by `IntroScreen.tsx`
- `web/public/scenes/earth-day-sm.png` - 820x547, no direct reference found
- `web/public/scenes/earth-day.png` - 1536x1024, used by `HubScreen.tsx` and `BuildPlaceScreen.tsx`
- `web/public/scenes/earth-dusk-sm.png` - 820x547, no direct reference found
- `web/public/scenes/earth-dusk.png` - 1536x1024, no direct reference found

Exact duplicate:

- `web/public/earth-dusk.png`
- `web/public/scenes/earth-dusk-sm.png`

Near-duplicate/redundant set:

- `web/public/earth-day.jpg`
- `web/public/scenes/earth-day-sm.png`
- `web/public/scenes/earth-day.png`

Recommendation:

- Keep canonical Earth scene assets under `web/public/scenes/`.
- Migrate root-level consumers away from `/earth-day.jpg` and `/earth-dusk.png`.
- Delete `web/public/earth-dusk.png` after `IntroScreen.tsx` moves to `/scenes/earth-dusk-sm.png` or `/scenes/earth-dusk.png`.
- Delete `web/public/scenes/earth-day-sm.png` unless a responsive image path is added.
- Keep `web/public/scenes/earth-day.png`.
- Keep either `web/public/scenes/earth-dusk.png` for full-resolution dusk scenes or `web/public/scenes/earth-dusk-sm.png` for intro-sized loading. Do not keep both unless components use size-specific variants intentionally.

## Files To Keep

Keep in `web/public/game/assets/ores/`:

- `ore_carbon.png`
- `ore_cobalt.png`
- `ore_gold.png`
- `ore_ice.png`
- `ore_iron.png`
- `ore_nickel.png`
- `ore_rare.png`
- `ore_silicon.png`

Keep in `web/public/parts/` because they are referenced by current data:

- `starter_rocket_t1.png`
- `reinforced_hull_t2.png`
- `cargo_bay_t1.png`
- `basic_thruster_t1.png`
- `fusion_drive_t2.png`
- `ion_drive_t3.png`
- `mining_drill_t1.png`
- `laser_drill_t2.png`
- `broadcast_array_t2.png`
- `basic_hull_t1.png` only as a temporary placeholder; it is a byte duplicate of `starter_rocket_t1.png`

Keep canonical Earth scene assets:

- `web/public/scenes/earth-day.png`
- One dusk canonical: preferably `web/public/scenes/earth-dusk.png` for full-size scene use, or `web/public/scenes/earth-dusk-sm.png` if only the intro needs the smaller asset.

## Files To Delete Or Deduplicate

Delete after confirming no external references:

- `web/public/parts/_generated/starter_rocket_t1_20260612_002132.png` because it is byte-identical to promoted runtime assets.
- `web/public/earth-dusk.png` after migrating `IntroScreen.tsx` to the canonical `web/public/scenes/` path.
- `web/public/scenes/earth-day-sm.png` unless responsive scene sizing is implemented.
- `.DS_Store` files under `web/public/`, `web/public/game/`, `web/public/game/assets/`, and `web/public/parts/`.

Deduplicate or replace:

- `web/public/parts/basic_hull_t1.png` and `web/public/parts/starter_rocket_t1.png` are byte-identical. Keep `starter_rocket_t1.png` for SR1. Replace `basic_hull_t1.png` with distinct art or update SR4/SR5 placeholders to reuse `starter_rocket_t1.png` explicitly.
- `web/public/earth-dusk.png` and `web/public/scenes/earth-dusk-sm.png` are byte-identical. Keep only one canonical path.

Archive outside runtime public assets, or delete if no source history is needed:

- `web/public/parts/_generated/starter_rocket_booster_t1_20260612_114012.png`
- `web/public/parts/_generated/starter_rocket_main_stage_t1_20260612_015831.png`
- `web/public/parts/_generated/starter_rocket_main_stage_t1_20260612_020317.png`
- `web/public/parts/_generated/starter_rocket_main_stage_t1_20260612_114012.png`
- `web/public/parts/_generated/starter_rocket_parts_t1_20260612_010314.png`
- `web/public/parts/_generated/starter_rocket_storage_bay_t1_20260612_020317.png`

These are draft artifacts, not stable runtime assets. If they matter as source material, move them to a non-public pipeline archive such as `tools/sprites/output/_generated/`.

## Misplaced Or Unused Files

- `web/public/game/assets/ships/` is currently empty but referenced by the manifest. Either populate it with final ship sprites or remove the manifest entries.
- `web/public/parts/_generated/` is under public runtime assets but contains draft timestamped outputs. Generated drafts should not ship from public paths.
- `web/public/earth-day.jpg` and `web/public/earth-dusk.png` are root-level scene assets. Scene imagery should live under `web/public/scenes/`.
- `web/lib/data/parts.ts` references `/parts/drill-hand.png`, but that file does not exist. This is outside the requested directories, but it is an asset pipeline defect.
- `web/public/game/assets/manifest.json` includes ship entries for missing files. This creates stale manifest state.

## Recommended Directory Structure

Final runtime structure:

```text
web/public/game/assets/
  manifest.json
  backgrounds/
    mining_asteroid_close.png
    mining_asteroid_far.png
    mining_planet_exo.png
    starmap.png
  ores/
    ore_iron.png
    ore_silicon.png
    ore_ice.png
    ore_carbon.png
    ore_nickel.png
    ore_cobalt.png
    ore_gold.png
    ore_rare.png
    ore_copper.png
    ore_aluminium.png
    ore_hydrogen.png
    ore_uranium.png
  ships/
    ship_sr1.png
    ship_sr2.png
    ship_sr3.png
```

Keep part/component art separate from ship art:

```text
web/public/parts/
  starter_rocket_t1.png
  reinforced_hull_t2.png
  cargo_bay_t1.png
  basic_thruster_t1.png
  fusion_drive_t2.png
  ion_drive_t3.png
  mining_drill_t1.png
  laser_drill_t2.png
  broadcast_array_t2.png
  ...
```

Move draft generated outputs out of public runtime paths:

```text
tools/sprites/output/_generated/
  <timestamped draft pngs>
```

## Final Layout Decision For `ships/` And `ores/`

- `web/public/game/assets/ores/` is the canonical runtime directory for mineral node sprites. It should contain one stable `ore_<mineral>.png` for every key in `MINERAL_META` that can appear in targets or generated missions. Add the four missing mineral icons and keep the current eight.
- `web/public/game/assets/ships/` is the canonical runtime directory for complete ship sprites only, matching manifest keys such as `ship_sr1`. Do not place component/part sprites here. Either generate/promote `ship_sr1.png`, `ship_sr2.png`, and `ship_sr3.png` into this directory, or remove those manifest entries until the game actually uses full ship sprites.
- `web/public/parts/` remains the runtime directory for assembly part icons and rocket-part catalog art.
- Timestamped generated drafts should not remain under `web/public/`; promote approved images to stable filenames, then archive or delete the drafts.

## Follow-Up Implementation Checklist

1. Generate missing ore icons for `copper`, `aluminium`, `hydrogen`, and `uranium`; update `tools/ruby-asset-pipeline/lib/ore_icon.rb` so `generate_assets ores` produces all `MINERAL_META` keys.
2. Decide whether full starter rocket sprites are needed. If yes, populate `web/public/game/assets/ships/ship_sr1.png`, `ship_sr2.png`, and `ship_sr3.png`; if no, remove stale ship entries from `manifest.json`.
3. Move `tools/sprites/generate_sprite.py` default output away from `web/public/parts/_generated` to `tools/sprites/output/_generated`.
4. Migrate Earth image references to `web/public/scenes/` and delete duplicate root-level Earth assets.
5. Fix or remove the missing `/parts/drill-hand.png` reference.
