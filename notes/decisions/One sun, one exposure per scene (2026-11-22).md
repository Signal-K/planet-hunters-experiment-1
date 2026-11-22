# One sun, one exposure per scene (2026-11-22)

Liam, on the Bennu Courier briefing: "we need to fix the lighting now."

A scene has one light and one exposure. Every surface in it looks lit by the same sun.

## Rule

- **One sun.** Terrain and entity art share one light from the screen's top left. Slopes facing away from it darken more than slopes facing it brighten, so relief reads by its shadow side, on dark ground too.
- **No clipped highlights.** Lit terrain goes through TakeOn's `exposure` curve, a soft shoulder above channel 186. Pale ground (ice, snow, salt) keeps its hue and relief instead of turning flat white. Dark colours are unchanged.
- **Patches are never a second light.** Low-frequency tone noise stays small (±9%), so it reads as material, not as uneven lighting.
- **One exposure on airless worlds.** On a body with no atmosphere, a pale skin (Snow, and Landnam biome skins) more than 70 luma brighter than the ground is dusted toward the ground colour. The dusting is at most 50% and keeps the skin's hue. Ore such as Water ice is never dusted, because it has to stand out. Worlds with air are untouched.

## Where

- TakeOn: `packages/engine/src/render/sprites.ts` (`exposure`), `renderer.ts` (`drawColumnV` lighting).
- Landnam: `web/lib/takeon/terrainColour.ts` (`dusted` in `applyTerrainLook`). This applies to Landnam's own TakeOn fields as well as Minimal.

## Why

Bennu's icefield was painted at Earth-snow #eef3f6 beside near-black carbonaceous rubble (#3b3530). The shader brightened lit tiles by up to 36% with a plain multiply, so the ice clipped to white. The white rover vanished into it, and the two grounds looked as if lit by different suns.
