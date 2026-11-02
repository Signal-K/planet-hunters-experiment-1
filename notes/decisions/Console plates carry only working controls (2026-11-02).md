---
type: decision
title: Console plates carry only working controls
project: Landnam
status: decided
created: 2026-11-02
---

# Console plates carry only working controls (2026-11-02)

From Liam's annotated iPad screenshot of the TESS classify console (SSL-749): the optics header with PWR/TRK/MAG lamps and the "Finish · Indigo, Auto · Lv 1" row read as cosmetic noise ("what is it for?"), "Drag dip" looked like a button but is an instruction, and the downlink terminal sat empty ("what goes here?").

## Decision

- An instrument plate shows its name and the controls that change the data or the view. No decorative lamps (PWR, TRK, MAG) and no cosmetic keys on the plates.
- The console finish still follows the level and can be pinned, but only with the `FINISH` command in the downlink. It is not a key on the optics plate. (Amends "Instrument consoles change colour with level".)
- Instructions are text, never shaped like a key. The TESS mark step reads "Drag across a dip on the chart", with the mark count and how to clear a mark.
- The downlink terminal always shows tappable command keys for that instrument (TESS: FOLD, BIN, SECTOR, HELP); each one runs exactly as if it were typed.
- The target star's details (host, TIC, temperature, constellation, distance, sector) go on the READOUT plate beside the player's own measurements.
- Every plate, including the verdict buttons, fits on screen at iPad size without scrolling the page; long readouts scroll inside their own plate.
