# Ruby Asset Pipeline — Implementation Spec

Formal spec for the Ruby asset pipeline, building on the design exploration.
Covers directory layout, Rake task interface, output conventions, sprite
generation parameters, seed data schemas, and the local-only vs CI boundary.

## Directory layout

```
tools/ruby-asset-pipeline/
├── Rakefile          # sprites:generate, seed:import, mock:start
├── Gemfile           # chunky_png, rspec, rake
├── .ruby-version     # pinned MRI version
├── lib/
│   ├── sprite_generator.rb   # ChunkyPNG-based sprite generation
│   └── seed_importer.rb      # catalog -> PocketBase seed JSON
├── output/
│   └── sprites/      # generated PNGs (committed, deterministic)
├── mock/             # Sinatra prototyping stubs (see mock/README.md)
├── spec/             # RSpec tests
└── missions-schema.yml  # YAML mission/event definition schema
```

## Rake task interface

### `rake sprites:generate[part_type,variant]`

- `part_type` — logical part name, e.g. `hull`, `booster`, `drill`.
- `variant` — tier/variant suffix, e.g. `t1`, `t2`.
- Output: `output/sprites/<part_type>_<variant>.png`, 512x512 RGBA PNG.
- Deterministic: same inputs always produce the same PNG bytes. Output is
  committed to the repo, not generated in CI.

### `rake seed:import[source,collection]`

- `source` — path to a JSON catalog data source (e.g. astronomy export).
- `collection` — PocketBase collection name the seed data targets.
- Output: `backend/migrations/<collection>.seed.json`, a JSON array of
  PocketBase-compatible records.
- Runs in CI (`.github/workflows/seed-data.yml`) because catalog data evolves
  independently of the codebase.

### `rake mock:start`

- Boots the Sinatra mock API (see `mock/README.md`) on port 4500 for
  endpoint prototyping.

## Sprite generation parameters

Sprite generation follows the parameter schema in
@doc/Landnam-docs_game-art_rocket-part-sprite-generation-spec:

- `hull_color` — base hull fill color (RGBA)
- `panel_color` — panel line stroke color
- `window_color` — window/hatch fill color
- `panel_lines` — array of x-offsets for vertical panel seam lines
- `windows` — array of `[x, y, w, h]` rectangles for windows/hatches

`SpriteGenerator.generate` accepts a `spec:` hash overriding `DEFAULT_SPEC`
for these fields.

## Seed data ETL pipeline

1. **Source**: a JSON export of catalog data (astronomy bodies, mission
   definitions, etc.), produced upstream (e.g. from the shared backend or a
   static catalog file).
2. **Transform**: `SeedImporter.load_source` parses the JSON source into
   plain records. Collection-specific transforms (field renames, type
   coercion) live alongside `SeedImporter` as the schema grows.
3. **Output**: `SeedImporter.import` writes
   `backend/migrations/<collection>.seed.json`, matching the PocketBase
   migration JSON format consumed by `backend/migrations/`.

## Local-only vs CI boundary

| Artifact | Where it runs | Why |
|---|---|---|
| Sprites (`sprites:generate`) | Local only | Deterministic output, committed as PNGs — no benefit to re-running in CI. |
| Seed data (`seed:import`) | CI (`seed-data.yml`) + local | Operates on evolving catalog data; CI keeps `backend/migrations/` in sync with source changes. |
| Mock API stubs (`mock/`) | Local only | Prototyping aid, never deployed. |

## References

- @doc/Landnam-docs_game-art_rocket-part-sprite-generation-spec — sprite
  parameter contract.
- `tools/ruby-asset-pipeline/missions-schema.yml` — YAML mission/event
  definition schema (task 018394).
