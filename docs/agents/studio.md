# Scene harness

Studio is a Unity-style authoring harness, not a web preview window. It shows
the authored object graph, its coordinate space, and the build contract for the
web and iOS adapters. The game runs separately through its fixture.

For one scene:

1. Edit `shared/authoring/scenes/<scene>.toml` and its feedback/notes.
2. Open `/game/studio?scene=<scene>` to inspect the scene graph and both target
   mappings. Do not judge the embedded Studio surface as the game.
3. Run `node scripts/scene.mjs <scene> --check` to mount the web fixture in the
   existing Simple Browser follower.
4. Launch the printed `SceneCatalog` id in the iOS Simulator when its adapter
   changed.

For a mission, make its standalone start fixture, objective, completion state,
web preset, and iOS fixture explicit in `qa/scenes.json`. The same id must work
with `node scripts/scene.mjs <mission> --check`. A mission may compose scenes,
but never requires campaign state or a prior manual click-path to begin.

`shared/authoring/missions/*.toml` is the canonical data source for shipped
mission definitions. Its required `[harness]` block records the independent
run contract. `node scripts/authoring.mjs check` catches source/output drift.

No snapshot board, iframe game preview, browser runner, native screenshot
matrix, or full-suite verification belongs in this workflow.
