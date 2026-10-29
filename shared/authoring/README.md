# Landnam scene source

This folder is the source of truth for the playable game graph. A scene is an
authored object hierarchy. A mission is an independent player loop with a
start fixture, one objective, and an observable completion state.

## Workflow

- Edit `scenes/<id>.toml` for scene objects and the web/iOS implementation map.
- Edit `missions/<id>.toml` for the shared mission declaration. Its mandatory
  `[harness]` points to the independent web preset and iOS `SceneCatalog` id.
- Register player-facing scene and mission fixtures in `qa/scenes.json`.
- Run `node scripts/authoring.mjs check` after source changes. Use `compile`
  only to regenerate the runtime manifests.
- Use `/game/studio?scene=<id>` for the blueprint and build contract. Use
  `node scripts/scene.mjs <id> --check` for the real web fixture in the Simple
  Browser, and launch the printed iOS fixture separately.

Studio never embeds the game as its editor. It is deliberately a scene graph
and adapter contract, like an engine editor. The web runtime and iOS app are
the two builds of that graph.

## Narrative boundary

The shipped game is the agency loop: place a launchpad, take one contract,
prepare and fly, mine or deliver, debrief, then enter free operations. The
telescope is an optional extension of that same loop. Refinery,
settlement, and other speculative systems are not new mission tracks unless a
new approved narrative contract adds an independent harness for them.
