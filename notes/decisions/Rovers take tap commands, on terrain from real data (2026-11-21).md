---
type: decision
title: Rovers take tap commands, on terrain from real data
project: Landnam
status: decided
created: 2026-11-21
---

# Rovers take tap commands, on terrain from real data (2026-11-21)

Decided by Liam on KES-543, after the steep portrait camera landed: "Maybe if it's
command-based for the rover, rather than a full joystick setup, it would be easier. I'm
starting to like this, we just need a really good, modular PCG system that does utilise
real data/terrain."

## Decision

- **A rover is driven by command, not a joystick.** The player taps the ground and the rover
  plans its own route round rocks and steep ground and drives there. Tapping scanned ore
  sends it into laser range, and it mines until the deposit is empty. The route shows as a
  dotted line to a marker. A tap with no way through shows a red cross. Keys may still steer
  by hand on desktop. The ship in orbit keeps drag steering, because a pass drifts on its own.
- **The view is wide enough to tap a destination** (about 18 m across the narrow side on
  the surface), and it stays steep, per the portrait rule.
- **Terrain is built by a modular PCG recipe, starting from real data where it exists.**
  - A field is a stack of swappable layers: a real DTM window, craters, boulders, dunes,
    relief, grain and ore. Hosts can add layers and compose recipes.
  - The Moon and Mars start from real stereo DTMs in true metres: HiRISE at Jezero and Gale,
    and Kaguya at Taurus-Littrow. They are cut from the USGS analysis-ready data, which is
    CC0.
  - Crater sizes follow a measured size–frequency law, and boulders follow the
    Golombek–Rapp rock-abundance model.
  - Bodies with no surface data are generated.
- **Real terrain is credited on screen** with a short line, for example
  "Real terrain · Gale crater dunes, Mars · HiRISE".

## Where it lives

TakeOn `packages/engine/src/field/`: `pcg.ts` (layers and recipes), `dem.ts` and
`dems.generated.ts` (real patches), `path.ts` (route planner), `scene.ts` (tap commands).
The patches are cut by `scripts/fetch-field-dems.py`.
