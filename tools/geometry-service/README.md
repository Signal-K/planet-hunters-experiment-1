# Geometry Service (Elixir) — Spike

Prototype "math co-processor" for Tier 1 geometry operations, validating the
pattern of a Go PocketBase hook calling out to an Elixir Plug service over
HTTP/JSON. See @task-b7c8d3 for the formal spec covering all Tier 1-3
operations, deployment, error contract, and observability.

## Endpoints (Tier 1, spike)

- `GET /health` — health check
- `POST /coordinate-conversion` — `{ra_deg, dec_deg}` -> `{x, y, z}`
- `POST /angular-distance` — `{a: [ra, dec], b: [ra, dec]}` -> `{distance_deg}`
- `POST /sector-lookup` — `{ra_deg, dec_deg}` -> `{sector}`

## Run locally

```bash
mix deps.get
mix run --no-halt
```

Runs on port 4002 (override with `PORT`).

## Docker

```bash
docker build -t landnam-geometry-service .
docker run -p 4002:4002 landnam-geometry-service
```

## Go hook integration

See `pocketbase/geometry_client.go` for the Go client used by PocketBase
hooks to call this service.
