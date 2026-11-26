# Landnam's Takeon engine package

`takeon-engine-0.2.7.tgz` is the vendored upstream package with one local
presentation change: `CAMERA_ELEVATION_DEG` in `dist/render/sprites.js` and
`sprites.d.ts` is 52 instead of 60. The engine derives its tile projection,
terrain sprites and pointer picking from that constant. Landnam's rover
painter uses the resulting rounded tile dimensions (32 × 25, height 10).

When updating the package, carry this change into Takeon source and rebuild,
then update Landnam's rover projection and package-lock integrity together.
