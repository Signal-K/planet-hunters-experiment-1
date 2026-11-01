---
type: decision
title: Instrument consoles change colour with level
project: Landnam
status: decided
created: 2026-11-01
---

# Instrument consoles change colour with level (2026-11-01)

Decided by Liam in the Claude session (SSL-744), after the glass console pass: "Different colours each time, based on levels. Allow for some level of customisation".

## Decision

- Each instrument level unlocks one console finish. The finishes are Indigo (LV 1), Ember (2), Glacier (3), Solar (4) and Void (5), wrapping after that.
- AUTO is the default. It follows the instrument's level, so each level-up repaints the console.
- The player can pin any unlocked finish. They do this with the FINISH key on the optics plate (AUTO → each unlocked finish), or with the `FINISH <NAME>` / `FINISH AUTO` console commands. A locked finish shows its level.
- The finish colours the glass panels, lamps, knob arcs, keycaps, CRT and the lightcurve chart. Amber stays the warning colour and the primary answer stays cream in every finish. No green or sea-green.
- The choice is cosmetic and per device, kept per instrument, like the orientation preference. It is not synced.

Source: `web/lib/instrument-finish.ts`, mirrored in `native/App/Screens/InstrumentViewport.swift` (`InstrumentFinish`).
