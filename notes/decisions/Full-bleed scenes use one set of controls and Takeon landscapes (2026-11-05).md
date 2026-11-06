---
type: decision
title: Full-bleed scenes use one set of controls and Takeon landscapes
project: Landnam
status: decided
created: 2026-11-05
---

# Full-bleed scenes use one set of controls and Takeon landscapes (2026-11-05)

Decided by Liam, reviewing the landing scene (a white website bar and panel over a plain dark box).

- Scenes that are a view of the world (pointing, landing, delivery) run full-bleed under one set of dark controls: BACK pill top-left, pills top-right, a glass status card bottom-left, a cyan action button bottom-right with a ghost button under it. They compose `web/components/game/hud/SceneChrome.tsx`; they do not restyle it and do not use the white `TopBar` or light panels.
- Landscapes come from Takeon (`TakeOnMount`, read-only for a view, `startView="iso"`), never a hand-drawn terrain. The scene's own layer (lander, plume, rings) sits over it.
