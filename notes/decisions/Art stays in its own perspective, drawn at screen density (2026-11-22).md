---
type: decision
title: Art stays in its own perspective, drawn at screen density
project: Landnam
status: decided
created: 2026-11-22
---

# Art stays in its own perspective, drawn at screen density (2026-11-22)

Decided by Liam on the Minimal base, after seeing Landnam's base structures stood on TakeOn's iso ground: "These
assets don't look good… this is just what I've been saying for days! The landscape is blurry as fuck. The assets
are incredibly shit", then "These structures do not look good, they don't fit on the terrain."

## Decision

- **Art is drawn in the perspective it was made for.** Landnam's v7 base structures were rendered by Blender for
  the side-on base camera (`shared/layout/base-site.json`), so they stand on the side-on base strip (sky, far
  plain, paved apron) at their authored size, footing and sprite offset. They never go on an iso or top-down
  ground, where they read as stickers. Iso scenes use art made for iso.
- **No placeholder art where real art exists.** A scene that has Landnam's real art for something shows that, not
  an engine's stand-in props.
- **Everything is drawn at screen density.** Baked layers (terrain chunks, tiles) are baked at the zoom × device
  pixel ratio they are shown at and rebaked when that changes; a canvas backing store is at least 2× on a phone.
  Nothing is stretched up from a 1× bake.
- **Sprites are shown at or below their native density.** The v7 art is 6 px per kit unit, so on a 3× phone a
  structure is at most 2 css px per unit. Downscaled art is smoothed, never `image-rendering: pixelated`.

## Where it applies

Landnam web and iOS, Landnam Minimal and TakeOn's renderer. First applied in Minimal's base
(`minimal/src/BaseScene.tsx`) and TakeOn's `IsoTerrainLayer` (chunks baked at screen density, backing store
capped at 2× instead of 1.5×).
