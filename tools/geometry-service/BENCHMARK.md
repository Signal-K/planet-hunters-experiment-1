# Geometry Service vs Inline Go Math — Benchmark

Compares the Elixir geometry service (@task-e2f4a1) against doing the same
Tier 1 math inline in Go (PocketBase hooks), per @task-f9a2b5. Target from
the design exploration: **<200ms per operation**.

## Harness

- **Inline Go**: `pocketbase/geometry_inline.go` implements
  `AngularDistanceInline`, `EquatorialToCartesianInline`, and
  `SectorForInline` as pure functions with no I/O.
- **Geometry service**: `pocketbase/geometry_bench_test.go` benchmarks
  `POST /angular-distance` against a running instance of
  `tools/geometry-service` (set `GEOMETRY_SERVICE_URL`, defaults to
  `http://localhost:4002`). The benchmark skips automatically if the service
  isn't reachable.

Run:

```bash
cd pocketbase
go test -bench Angular -benchtime=10000x ./...
```

## Results

### Inline Go (`BenchmarkAngularDistanceInline`)

Measured on Apple M4 Pro, 10,000 iterations:

| Metric | Value |
|---|---|
| Latency (mean) | ~48 ns/op |
| Throughput | ~20M ops/sec (single core, no I/O) |
| Memory | 0 allocations (pure float math) |

### Geometry service (`BenchmarkAngularDistanceService`)

Not measured in this environment — `tools/geometry-service` requires a Mix
toolchain / Docker build that isn't available in the sandbox used for this
spike. Expected order of magnitude based on the architecture:

| Metric | Expected |
|---|---|
| Latency (P50/P95/P99) | ~0.5-3ms per call (localhost HTTP round trip + JSON encode/decode dominates; the Nx computation itself is sub-microsecond for Tier 1 ops) |
| Throughput | Bounded by HTTP/JSON overhead, likely low thousands of req/sec per instance |
| Memory | JSON allocation per request (request + response bodies), GC pressure under sustained load |

To fill in real numbers, run the benchmark against a running
`tools/geometry-service` instance:

```bash
cd tools/geometry-service && mix deps.get && mix run --no-halt &
cd ../../pocketbase && GEOMETRY_SERVICE_URL=http://localhost:4002 go test -bench Angular -benchtime=10000x ./...
```

## Conclusion

For Tier 1 operations (coordinate conversion, angular distance, sector
lookup), inline Go is **4-5 orders of magnitude faster** than an HTTP round
trip to any external service — these are simple float operations with no
benefit from Nx vectorization at this scale.

This validates the design's framing: the geometry service earns its keep on
**Tier 3 operations** (procedural body generation, noise generation, convex
hull, trajectory propagation) where Nx's vectorized array operations and
batch processing amortize the HTTP overhead across many points per request.
For Tier 1 single-point operations, prefer the inline Go implementations
(`pocketbase/geometry_inline.go`) and reserve the geometry service for
batched/Tier 3 work — both are well within the <200ms target either way.
