---
name: landnam-design
description: Design Landnam web and native game scenes and interface assets using the current shared palette, scene kit and parity contract.
user-invocable: true
---

# Landnam design

Read the repository [AGENTS.md](../../../AGENTS.md) and the relevant section of [game-theme-spec.md](../../../docs/design/game-theme-spec.md). They define the current rules. Implement each acceptance slice on web and native consecutively.

Current source map:
- Palette input: `shared/tokens/tokens.json`; generated web tokens in `web/app/globals.css`, native aliases in `native/App/Theme.generated.swift`. Run `node scripts/sync-shared.mjs --check` after changes. World tokens outside the generated block still follow the game-theme spec.
- Web scenes: `web/components/game/GameScreenRouter.tsx`, `web/components/game/hub/TerrainScene.tsx`, `web/lib/scene/`.
- Native scenes: `native/App/RootView.swift`, `native/App/Terrain.swift`, `native/App/Screens/`.
- Shared layout: `shared/layout/`; snapshot fixtures: `web/tests/scenes/` and `native/App/SceneCatalog.swift`.
- Fonts: shipped web fonts are the source; native faces are synchronized by `scripts/sync-native-fonts.mjs`.

Use the approved deep dusk world palette with blueprint interface chrome. Compare the same real screen state on web and native; verify the viewport, object contact with surfaces, readable text, touch targets and animation as required by AGENTS.md.

The bundled README, `colors_and_type.css`, previews and `ui_kits/landnam-portrait/` are historical design references. They are not current tokens, app architecture or implementation instructions. Do not import the old CSS into new work or follow Godot prompts. Inspect legacy art individually before reusing it; use current modular scene layers rather than a whole-scene background image.
