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

## Testing

RSpec covers both primary tasks:

| Spec file | Coverage |
|---|---|
| `spec/sprite_generator_spec.rb` | `SpriteGenerator.generate` — 512×512 PNG dimensions |
| `spec/seed_importer_spec.rb` | `SeedImporter.load_source` (missing file, valid JSON), `SeedImporter.import` (output path, JSON content, dir creation) |
| `spec/missions_schema_spec.rb` | `missions-schema.yml` structure validation |

Run locally: `bundle exec rspec spec/`

CI runs RSpec before `rake seed:import` in `.github/workflows/seed-data.yml`
and in the `seed-data` service in `docker-compose.ci.yml`.

## ChunkyPNG Spike Findings

Discovered during @task-4f921e. ChunkyPNG is sufficient for the full Tier 1
sprite requirement with one constraint:

| Capability | Status | Notes |
|---|---|---|
| 512×512 RGBA PNG generation | ✓ Works | No size limit in practice |
| Filled rectangles (`rect` with fill color) | ✓ Works | Hull, window, and hatch shapes |
| Single-pixel lines (`line`) | ✓ Works | Panel lines, edge trim |
| Per-pixel access (`set_pixel`) | ✓ Works | For advanced procedural fill |
| Anti-aliased lines / curves | ✗ Not supported | ChunkyPNG is pixel-grid only |
| Bezier / spline curves | ✗ Not supported | Would require manual rasterisation |
| Text rendering | ✗ Not supported | Labels must be composited externally |
| Multi-layer blend modes | ✗ Not supported | Blending must be done per-pixel manually |
| JPEG / WebP output | ✗ Not supported | PNG only (acceptable for game sprites) |
| External system dependencies | ✓ None required | Pure Ruby; `gem install chunky_png` is sufficient |

**Verdict**: ChunkyPNG handles all Tier 1 sprite operations (geometric shapes,
panel lines, filled windows/hatches). Anti-aliasing and curves are out of
scope for the spike. If smooth curves become a requirement, migrate to Vips
(via `ruby-vips`) or Imagemagick (`mini_magick`), both of which have system
library deps but add full anti-aliasing and blend mode support.

## References

- @doc/Landnam-docs_game-art_rocket-part-sprite-generation-spec — sprite
  parameter contract.
- `tools/ruby-asset-pipeline/missions-schema.yml` — YAML mission/event
  definition schema (task 018394).
- `.github/workflows/seed-data.yml` — CI workflow running rspec + seed:import.
- `docker-compose.ci.yml` (service: `seed-data`) — local CI parity for the seed pipeline.
