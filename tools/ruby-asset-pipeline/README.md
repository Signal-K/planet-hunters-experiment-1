# Ruby Asset Pipeline

Seed-data ETL for Landnam.

Procedural sprite generation (`sprite_generator.rb`, `space_background.rb`,
`ore_icon.rb`) was retired 2026-07-16 — superseded by
`tools/sprites/generate_sprite.py` (Replicate/Flux-based external generation),
which is the actively-used path for new sprite/background assets.

## Setup

```bash
cd tools/ruby-asset-pipeline
bundle install
```

## Tasks

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
