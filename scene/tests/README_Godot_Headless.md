# Running Godot headless tests (Supabase)

This folder includes `run_supabase_tests.gd`, a minimal headless GDScript test which calls `SupabaseClient.fetch_anomalies` and exits with meaningful status codes.

How to run locally

1. Ensure you have a Godot 4.x binary installed and accessible as `godot` on PATH. If not, download the matching Godot version from https://godotengine.org/download.

2. From the project root run the headless test pointing Godot to the `scene` project folder:

```bash
godot --headless --path scene -s scene/tests/run_supabase_tests.gd
```

Expected exit codes

- `0` : Test passed (fetched data array)
- `2` : HTTP fetch returned an error (network/auth issue)
- `3` : Unexpected response type
- `4` : Timeout waiting for HTTP response

## Experience tests

Run the experience/level/unlock tests:

```bash
godot --headless --path scene -s scene/tests/run_experience_tests.gd
```

Notes

- The test uses the `SupabaseClient` script in `res://Scripts/Systems/SupabaseClient.gd`. By default `SupabaseClient` points to a local Supabase dev server (`http://127.0.0.1:54321`). Ensure a local Supabase dev instance or a reachable Supabase REST endpoint is available for meaningful results.
- For CI, run Godot in a runner that has networking to the Supabase instance, or mock the HTTP endpoint.
