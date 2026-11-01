---
type: decision
title: Surface terrain is coloured by what the body is
project: Landnam
status: decided
created: 2026-10-30
---

# Surface terrain is coloured by what the body is (2026-10-30)

Liam: "Can we make takeon a bit easier to use, and add a more dynamic terrain colour engine that
takes into account the object type and probable conditions? Everything looks icy."

## Decision

- The rover field (Takeon) is no longer pushed onto one ice-blue ramp. The SSL-501 blueprint reskin
  and the stage hue filter that turned every warm or green pixel cyan are gone.
- A body's ground and sky come from what it is made of and its likely conditions
  (`web/lib/takeon/terrainColour.ts`): carbonaceous asteroids are dark, stony ones tan, metallic
  ones steel grey, Mars rust under a dusty sky, Io sulfur yellow, Venus scorched under a yellow
  haze, Titan brown under an orange haze, Europa ice. Cold bodies with ices frost over, hot ones
  darken, airless bodies have a black sky.
- Ores keep their own mineral colour on every body, so a deposit always reads as itself.
- Wandering creatures, flora and flyers appear only on a world whose life is blooming or thriving.
- Easier rover: one MINE press (or E) digs down through loose regolith until it reaches rock, and
  drills whichever side can be drilled, so the rover does not need lining up. The field opens at a
  wider camera.
