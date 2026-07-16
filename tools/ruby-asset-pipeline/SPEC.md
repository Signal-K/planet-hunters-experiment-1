# Ruby Asset Pipeline — Implementation Spec

Formal spec for the Ruby asset pipeline's seed-data ETL, building on the
design exploration. Covers directory layout, Rake task interface, output
conventions, seed data schemas, and the local-only vs CI boundary.

Procedural sprite generation (`sprites:generate`, `SpriteGenerator`,
`SpaceBackground`, `OreIcon`) was retired 2026-07-16 in favor of
`tools/sprites/generate_sprite.py` (Replicate/Flux-based external
generation). The ChunkyPNG spike findings that informed the original sprite
work are preserved in git history (see the pre-2026-07-16 revision of this
file) but no longer describe live code.

## Directory layout

```
tools/ruby-asset-pipeline/
├── Rakefile          # seed:import, mock:start
├── Gemfile           # rspec, rake
├── .ruby-version     # pinned MRI version
├── lib/
│   └── seed_importer.rb      # catalog -> PocketBase seed JSON
├── mock/             # Sinatra prototyping stubs (see mock/README.md)
├── spec/             # RSpec tests
└── missions-schema.yml  # YAML mission/event definition schema
```

## Rake task interface

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
| Seed data (`seed:import`) | CI (`seed-data.yml`) + local | Operates on evolving catalog data; CI keeps `backend/migrations/` in sync with source changes. |
| Mock API stubs (`mock/`) | Local only | Prototyping aid, never deployed. |

## Testing

| Spec file | Coverage |
|---|---|
| `spec/seed_importer_spec.rb` | `SeedImporter.load_source` (missing file, valid JSON), `SeedImporter.import` (output path, JSON content, dir creation) |
| `spec/missions_schema_spec.rb` | `missions-schema.yml` structure validation |

Run locally: `bundle exec rspec spec/`

CI runs RSpec before `rake seed:import` in `.github/workflows/seed-data.yml`
and in the `seed-data` service in `docker-compose.ci.yml`.

## References

- `tools/ruby-asset-pipeline/missions-schema.yml` — YAML mission/event
  definition schema (task 018394).
- `.github/workflows/seed-data.yml` — CI workflow running rspec + seed:import.
- `docker-compose.ci.yml` (service: `seed-data`) — local CI parity for the seed pipeline.
