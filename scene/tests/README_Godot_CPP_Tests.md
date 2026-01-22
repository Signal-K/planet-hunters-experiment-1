# Godot C++ Unit Tests (Supabase)

This folder contains a minimal C++ unit test that verifies the `SupabaseClient.gd` script resource can be loaded by the engine. Godot's C++ unit test framework runs inside the engine source tree; these files must be copied into the engine's tests location before building and running tests.


How to run (summary):

1. Clone the Godot engine source (use the same minor version as your local Godot, e.g. 4.5.x).
2. Place `test_supabase_cpp.cpp` from this repo into the engine tests directory — for example:

   - `godot/tests/` (core-level tests)
   - or `modules/<module>/tests/` (module-level tests)

3. Ensure your Godot `res://` path points to this project when the engine runs tests. A common approach is to copy the project files (the `scene` folder) into the engine source tree or run the engine from the project root with a `--path` argument as appropriate.

4. Build Godot with tools/tests enabled. Example for macOS:

```bash
# from the Godot source root
scons platform=osx tools=yes target=debug
```

5. Run the test runner produced by the build. Example (binary name can differ by build settings):

```bash
# list tests
bin/godot.osx.debug.tools.64 --test

# run tests (runs all tests by default)
bin/godot.osx.debug.tools.64 --test --run
```

Notes and next steps:

- The included C++ test verifies the GDScript resource loads and can be instantiated inside the engine. It also checks for the `fetch_anomalies` method.
- To assert network behavior (calling `fetch_anomalies` and inspecting returned data) you must run the test inside a built Godot engine where `res://` points to your project and networking is allowed. The test can be extended to:
  - create a helper Node implemented in C++ that exposes a callback method matching the GDScript callback signature,
  - call `fetch_anomalies` with a `Callable` pointing to that helper,
  - pump the main loop (or use engine test helpers) until the callback fires and then assert on the response data.
- If you'd like, I can add a ready-to-integrate extended C++ test that performs an actual HTTP request against your local Supabase (it will require the engine build to run). Tell me whether you prefer a) a synchronous-style test that uses the engine main loop to wait for the HTTP signal, or b) a fully asynchronous test that uses engine test helpers to schedule assertions.
 - I added `scene/tests/CallbackHelper.gd` (a small GDScript helper) and `scene/tests/test_supabase_net.h` which:
   - instantiates `SupabaseClient.gd` and the helper,
   - calls `fetch_anomalies("active-asteroids", 1, callable)` from C++,
   - processes the `SceneTree` loop for up to 10s waiting for the callback,
   - asserts the callback was invoked and that the response is an Array with no error.

  This test uses only engine APIs and the helper GDScript to receive the callback, so it can run under the engine test runner without adding new C++ binding code.

