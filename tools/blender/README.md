# Blender sprite pipeline

Authoring tool for Landnam's game art. Models are written as Python, rendered
headless to flat orthographic PNGs, and loaded by `AssetManager` exactly like
any hand-drawn sprite.

```bash
blender --background --factory-startup --python tools/blender/render_all.py
blender --background --factory-startup --python tools/blender/render_all.py -- --only actors
```

Output lands in `web/public/game/assets/`. Requires Blender 5.x on `PATH`
(`brew install --cask blender`). Nothing in the web build depends on Blender —
the PNGs are committed, so `npm run build` and Docker never need it.

## Why this shape

**PixiJS is a 2D renderer.** No mesh from here ever ships. "Lightweight enough
for Pixi" is therefore a question of output pixel budget, not polycount — a
200k-triangle model and a cube cost identically once both are a 144×36 PNG. Feel
free to model in as much detail as reads at sprite size.

For reference, all eight current sprites total **39 KB**. The seven pre-existing
hand-made PNGs total **~3.7 MB**. Flat faceted colour compresses to almost
nothing; that is a property of the art direction, not of Blender.

**Models are Python, not `.blend` files.** They diff, review and regenerate like
any other source. A binary blob only one machine can open is how an asset
pipeline quietly dies.

**No lights.** Every material is a pure emission shader and the cel shading is
baked into *which* material each face gets — top faces lit, sides mid,
camera-facing shade. Lighting rigs drift between renders and produce soft
falloff; the design language calls for chunky faceted flat colour with no
gradients, so the facets are assigned by face normal instead.

**Outlines are inverted hulls**, not Freestyle: a solidify modifier pushed
outward with flipped normals, a black emission material, and backface culling so
only the far side shows. Deterministic headless, no render-engine config.

## Layout

```
landnam_kit.py           palette, materials, geometry helpers, camera, render
render_all.py            driver — walks every model module, one PNG each
models/terrain.py        modular background kit — mountains, hills, trees,
                          rocks, roads, distant facilities, clouds (KES-260)
models/structures.py     every Earth Base building, one shared scale (KES-260)
models/actors.py         rover and drone (2)
models/ships.py          Explorer/Prospector hulls + Explorer cutaway (KES-41/STS-611)
models/rooms.py          ship interior room panels (KES-41/STS-611)
models/parts.py          web/parts/ shop icons — writes outside game/assets/
                          via a "../../parts/foo" key (KES-88)
```

## Adding a sprite

1. Write a build function in a module under `models/`. It creates objects into
   the current (already-empty) scene and returns its render spec:

   ```python
   def my_thing():
       body = kit.box("body", (1.0, 1.0, 1.2), bevel=0.05)
       kit.solid("body", body, T["hull"], "hull")
       return dict(layout=(48, 48), ortho=2.4, mode="iso", target=(0, 0, 0.6))
   ```

2. Register it in that module's `BUILDS` dict under its output path
   (`"hub/my_thing"` → `web/public/game/assets/hub/my_thing.png`).
3. Add the module to `MODULES` in `render_all.py` if it is new.
4. Render, then add the manifest entry in
   `web/public/game/assets/manifest.json`.

`lib/engine/manifest.test.ts` fails if a manifest entry points at a missing
file, if a rendered sprite is missing from the manifest, or if a new sprite
blows the 250 KB budget. Run `npm run test:unit` after adding one.

## Camera modes

`mode="flat"` is a straight-on elevation, for sprites composited into 2D side
views — the hub structures, the launch stack.

`mode="iso"` matches **takeon's** isometric terrain. Its tiles are 32×16, a 2:1
ratio, so the pitch is `atan(0.5)` = 26.565° — *not* the 35.264° of a true
isometric cube. Anything that has to sit on takeon ground must use this, or it
will read at a subtly wrong angle against the terrain underneath it.

## Sizes

`layout` is the size in CSS pixels the sprite is drawn at in game; the render is
`SUPERSAMPLE`× that (currently 3×) so it stays crisp at devicePixelRatio 2–3.

For the hub props, layout sizes are fixed by the `makeSprite` calls in
`lib/pixi/hubScene.ts`. Changing one without the other produces a squashed
sprite, not an error.

## One kit, one style (KES-260, 2026-08-26)

`terrain.py` and `structures.py` replaced `hub_structures.py` and
`launchpad.py`. The old pair had accumulated four generations of launch pad
(`pad_complex`, `_v2`, `_v3`, `_v4`), four hangars and two `modular_v2`
rewrites, each authored at its own camera mode, ortho scale and outline weight
— and the *background* was a painted JPG plate with hand-written SVG skyline
glyphs on top of it. Four art languages on one screen, which is why the
buildings read as sprites pasted onto a photograph.

Three rules now hold it together and apply to anything new:

1. **One scale.** `structures.py`'s `_spec()` derives layout size from world
   size via `PX_PER_UNIT`. Never hand-pick a `layout`/`ortho` pair for a
   structure.
2. **One camera.** `mode="side"` for terrain and structures alike. A brick at a
   different pitch reads as another game the moment it sits next to a building.
3. **One ground.** Every structure stands on a `_raft` apron. A wall that stops
   at the sprite's bottom edge is a cut-out no shadow can rescue.

Depth is applied at runtime, not in the render: the web app's `TerrainScene`
washes each depth band toward the sky colour through a mask of the sprite's own
silhouette. So terrain is authored *mid-tone and unhazed*, and one
`mtn_peak_tall.png` serves as both a pale horizon ridge and a solid near mass.
Pre-hazing a brick locks it to one distance and defeats the kit.

Scene composition lives in `web/lib/scene/compositions.ts` — one line per placed
brick. `earth-base-wide` (Hub) and `earth-base-pad` (Launchpad) are deliberately
different placements of the same kit, which is what makes walking up to the pad
change the horizon.

## Not done yet

- **Atlas packing.** Each sprite is its own PNG and its own HTTP request. Past
  ~30 sprites (getting close — the set is at 20+ now across hub, launchpad,
  actors, ships and rooms) it will be worth solving. `AssetManager` would need
  a frame-rect lookup to support it.
- **Landscape / terrain.** takeon draws its iso terrain procedurally
  (`SpriteCache.renderTile` composes three-face cubes per material), so Blender
  is not in that path today. The route in would be rendering *tile* and *prop*
  sheets at the same 32×16 metrics and having takeon blit those instead of its
  generated cubes — a takeon-side change, in `signal-k/takeon`, not here.
- **The rest of `web/parts/`.** `parts.py` (KES-88) covers only the two shop
  icons that were off-style/oversized outliers (`basic_hull_t1`,
  `starter_rocket_t1`). The other 13 hand-made part icons are already small
  and on-style — revisit for consistency, not urgency.

Done, despite being listed here as pending as recently as 2026-08-01: the four
room interiors, two ships and the cutaway that used to total 3.7 MB were
re-rendered through `models/ships.py`/`models/rooms.py` (KES-41/STS-611) and
are pinned in `manifest.test.ts`'s `LEGACY_OVERSIZED` list — now empty — as the
record of what "photographic PNG in a flat-faceted game" looked like. Check
that list and the manifest test's own comment before trusting this file on
what's re-rendered and what isn't; this section drifted out of date once
already (KES-57's investigation, 2026-08-03) and nearly caused duplicate work.
