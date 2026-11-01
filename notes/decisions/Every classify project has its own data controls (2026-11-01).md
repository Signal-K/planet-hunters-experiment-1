---
type: decision
title: Every classify project has its own data controls
project: Landnam
status: decided
created: 2026-11-01
---

# Every classify project has its own data controls (2026-11-01)

Decided by Liam in the Claude session (SSL-745): "Can the controls zoom in or out on the graphs, do phase-folding, etc? For every type of graph or project, add special dynamic controls."

## Decision

- The shared OPTICS plate (aim, zoom, focus, exposure, stretch, invert) changes the picture. Every classify project also gets its own instrument plate under it, and that plate acts on the project's data.
- Transit telescope, PHOTOMETRY TP-02:
  - TIME zooms the time axis, SCAN slides the window, and BIN averages neighbouring points.
  - PERIOD with the FOLD lever phase-folds every sector on a trial period. The fold is centred on the player's first marked dip, so the right period stacks the transits at T0.
  - (SNAP, which folded on the period measured from two marks, was removed by SSL-747: the player finds the period.)
  - Marking pauses while the curve is folded.
- Space telescope (NEOCP), ASTROMETRY AS-03: FIELD zooms the real RA/Dec chart around the object, and the grid gets finer as it zooms. GRID and ECLIPTIC switch the overlays. (The ECL LAT readout and NEAR ECL lamp were removed by SSL-747; the player reads the offset off the chart and logs it on OFFSET.)
- Saturn imager, IMAGING SI-04:
  - CONTRAST adjusts the frame, PALETTE applies a false-colour map (CLR, HEAT, ICE, MT) and SHARPEN sharpens it.
  - LOUPE fills the well with the selected square at a true 3×, and NEXT SQ steps to the next square.
- Every control also has a console command (FOLD, PERIOD, TIME, SCAN, BIN, FIELD, GRID, ECLIPTIC, PALETTE, CONTRAST, SHARPEN, LOUPE).
- A new project brings its own plate. Its controls must change what the data shows; renaming a CSS transform does not count. A label like "3×" must be true on screen.

See also: "Instrument controls never do the player's work" (SSL-747), which supersedes the SNAP and ECL LAT lines.

Source: `InstrumentViewport` `module` prop (web and iOS), `web/lib/instrument-viewport/lightcurve-controls.ts`, mirrored by `LightcurveControls` in `native/App/Screens/TessDiscoveryScreen.swift`.
