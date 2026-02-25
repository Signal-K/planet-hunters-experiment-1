# Godot Test Suite - Simple Descriptions

This file lists the Godot test scripts and a short description of what each one verifies.

- `run_supabase_tests.gd`: Tests `SupabaseClient.fetch_anomalies` by issuing an HTTP request for `anomaly_set=active-asteroids` with `limit=1`. Verifies that a response arrives and is an array. (Integration test for Supabase HTTP fetch.)

- `run_experience_tests.gd`: Tests XP gain, level-up thresholds, rocket unlocks (starterrocket2 at level 2), rocket selector layout constraints (no-scroll card layout + full-screen selector offsets when no awaiting rocket), and preview/transit routing/timing helpers. (Unit/integration test for progression + selector layout + transition logic.)

- `run_tutorial_tests.gd`: Tests the tutorial infrastructure controller for ordered progression, skip/replay controls, and persistence across controller recreation. (Unit/integration test for onboarding runtime state machine.)
