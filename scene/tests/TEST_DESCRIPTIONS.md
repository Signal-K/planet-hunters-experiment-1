# Godot Test Suite - Simple Descriptions

This file lists the Godot test scripts and a short description of what each one verifies.

- `run_supabase_tests.gd`: Tests `SupabaseClient.fetch_anomalies` by issuing an HTTP request for `anomaly_set=active-asteroids` with `limit=1`. Verifies that a response arrives and is an array. (Integration test for Supabase HTTP fetch.)

- `run_tutorial_tests.gd`: Tests the tutorial skip flow inside Godot. Instantiates `AppController` and the `TutorialPanel` scene, simulates pressing the `Skip Tutorial` button, and verifies that `AppController` emits `tutorial_completed_updated(true)` and marks the tutorial complete. (Unit/integration test for Godot UI → AppController signal flow.)
- `run_experience_tests.gd`: Tests XP gain, level-up thresholds, and rocket unlocks (starterrocket2 at level 2). (Unit/integration test for experience + unlock logic.)
