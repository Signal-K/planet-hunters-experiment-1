---
name: landnam-design
description: Use this skill to generate well-branded interfaces and assets for Landnam (the mining/exploration minigame in the Star Sailors ecosystem), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file at the root of this skill first — it covers the brand context, content fundamentals, visual foundations, and iconography. Then explore the other available files.

Key files:
- `colors_and_type.css` — all design tokens (color, type, radii, spacing, motion). Mirrors the in-engine `DS.gd`. Import this in every mock.
- `fonts/` — Oxanium (display/body) + Turret Road (atlas/mono).
- `assets/` — real SVG nav icons, the game-art rocket-part tiles (`parts/`), the painted Earth Base backdrop (`scenes/`), and the source screenshots (`reference/`).
- `preview/` — small token-spec cards (the Design System tab).
- `ui_kits/landnam-portrait/` — the canonical portrait mobile prototype: full Build → Hub → Mission → Target → Fab → Launch → Mine → Debrief loop, the Mission Coach tutorial, and the deferred unlock popups. Read `app.tsx` for the state machine and the per-file headers for component maps. `storyboard.html` lays out every state as labelled frames.
- `ui_kits/landnam-portrait/GODOT_*.md` — paste-ready Claude Code prompts that replicate the home scene and the tutorial in the Godot project.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and build static HTML files for the user to view. If working on production Godot code, copy assets and read the rules here to design accurately with this brand — always source color/size/spacing from `DS.gd` in-engine (1:1 with `colors_and_type.css`).

This game is **mobile-first and portrait**, built in Godot. It is a game, not a website — no dashboards or sidebars. Everything must be readable on a phone. If the user invokes this skill without other guidance, ask what they want to build, ask a few focused questions, and act as an expert designer who outputs HTML artifacts _or_ production code depending on the need.
