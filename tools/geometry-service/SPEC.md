# Elixir Geometry Service — Formal Spec

This is the production spec for the geometry "math co-processor" service,
replacing the design exploration from @task-e2f4a1 with a directly actionable
implementation contract.

## API contract

Full OpenAPI 3.0 spec: `openapi.yaml`, covering Tier 1-3 operations:

- **Tier 1**: `/coordinate-conversion`, `/angular-distance`, `/sector-lookup`
  (implemented in the spike)
- **Tier 2**: `/orbital-position`, `/phase-angle`, `/line-of-sight`
- **Tier 3**: `/procedural-body`, `/spatial-range-query`, `/convex-hull`,
  `/trajectory-propagation`, `/noise-generation`

All endpoints accept and return `application/json`. Numeric fields use
degrees for angles and AU (astronomical units) for distances unless noted.

## Deployment

- **Runtime**: Elixir 1.16 + OTP, Plug/Cowboy HTTP server (Phoenix only if
  routing/middleware needs grow beyond Plug.Router).
- **Port**: 4002 (override via `PORT` env var).
- **Docker**: built from `tools/geometry-service/Dockerfile`, multi-stage
  (build + runtime).
- **Docker Compose**: add a `geometry-service` entry depending on nothing
  (stateless). PocketBase services that call it (`pocketbase`, shared
  `backend`) should declare `depends_on: [geometry-service]` with a
  `condition: service_healthy` health check against `GET /health`.
- **Environment variables**:
  - `PORT` — HTTP port (default `4002`)
  - `GEOMETRY_SERVICE_URL` (consumer-side, set on PocketBase services) —
    base URL the Go client (`pocketbase/geometry_client.go`) uses, e.g.
    `http://geometry-service:4002`

## Error contract

- **2xx**: `200 OK` for all successful operations (no operation has side
  effects, so no `201`/`204` needed).
- **422 Unprocessable Entity**: request body fails schema validation
  (missing required fields, out-of-range values such as eccentricity
  outside `[0, 1]`).
- **500 Internal Server Error**: unexpected computation failure (e.g. Nx
  backend error). Logged with a request id for correlation.
- **Body shape** (4xx/5xx):
  ```json
  {
    "error": "validation_error",
    "message": "eccentricity must be between 0 and 1",
    "details": { "field": "eccentricity", "value": 1.5 }
  }
  ```
  `error` is a stable machine-readable code (`validation_error`,
  `internal_error`); `message` is human-readable; `details` is optional and
  operation-specific.

## Caching

None initially. Tier 1-2 operations are cheap pure functions; Tier 3
operations (procedural generation, trajectory propagation) are deterministic
given their inputs. Add an ETS-based cache with TTL only if profiling
(@task-f9a2b5) shows a specific endpoint is a bottleneck under realistic load.

## Rate limiting

In-process GenServer token bucket per client IP, mirroring the pattern used
for guest signup rate limiting in PocketBase (`pocketbase/guest_accounts.go`).
Single-instance only — no shared state needed since the service is stateless
and horizontally scaled instances are independent.

## Observability

- `GET /health` — returns `{"status": "ok"}`, used by Docker Compose health
  checks and the PocketBase startup dependency ordering.
- `GET /metrics` — Prometheus exposition format via `:telemetry` +
  `prometheus_ex`. Tracks per-operation request count, latency histogram
  (target P95 < 200ms per @task-f9a2b5), and error count by `error` code.
- Structured JSON logs via `Plug.Logger` + a JSON formatter, including
  request id, operation, status, and duration.

## Consumer integration (Go)

`pocketbase/geometry_client.go` provides typed wrappers (e.g.
`AngularDistance`) that POST to the service and decode the JSON response.
New Tier 2/3 operations should follow the same pattern: one exported Go
function per operation, using `geometryServiceURL()` for the base URL and
`geometryHTTPClient` (5s timeout) for the request.

## Migration path from spike

1. Promote `tools/geometry-service/lib/geometry_service/geometry.ex` from
   pure Erlang math to Nx-backed implementations for Tier 2-3 ops (matrix
   operations, noise generation benefit from Nx's vectorization).
2. Add the `/metrics` and rate-limiting GenServer described above.
3. Add Tier 2-3 routes to `router.ex` per `openapi.yaml`.
4. Wire `geometry-service` into `docker-compose.yml` with a health check.
5. Extend `pocketbase/geometry_client.go` with one wrapper per new operation.
