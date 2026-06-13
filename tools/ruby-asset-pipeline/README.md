# Ruby Asset Pipeline

Local-only sprite generation and seed-data ETL for Landnam.

## Setup

```bash
cd tools/ruby-asset-pipeline
gem install chunky_png   # only dependency required for sprite generation
bundle install            # full toolchain (rspec, rake)
```

## Tasks

- `rake sprites:generate[part_type,variant]` — generates a 512x512 procedural
  rocket part PNG to `output/sprites/`. Sprites are deterministic and committed
  as PNGs (not run in CI).
- `rake seed:import[source,collection]` — imports catalog data from `source`
  (a JSON file) and writes a PocketBase-compatible seed file to
  `backend/migrations/<collection>.seed.json`. Runs in CI (see
  `.github/workflows/seed-data.yml`) because it operates on evolving catalog
  data.

## Mock API prototyping

See `mock/README.md` for the Sinatra stub server used to prototype new
endpoints before implementing them in Go/Elixir.

## Tests

```bash
bundle exec rspec
```
