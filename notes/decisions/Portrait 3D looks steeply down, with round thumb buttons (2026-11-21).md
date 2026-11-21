---
type: decision
title: Portrait 3D looks steeply down, with round thumb buttons
project: Landnam
status: decided
created: 2026-11-21
---

# Portrait 3D looks steeply down, with round thumb buttons (2026-11-21)

Decided by Liam on KES-543, after reviewing the 3D field: "the rover looks too flat, and
plastic, and the buttons do not feel like they're part of a game… the 3D perspectives just
don't seem to be working on portrait mode."

## Decision

- **A 3D scene on an upright phone looks steeply down (about 55–65°), never a low chase
  camera on the horizon.** A low camera spends half of a tall screen on sky and squeezes the
  ground into a strip. The camera never turns, so up is always north. It frames a fixed
  ground width across the narrow side of the screen, so the vehicle is the same size on
  every phone. It sits a little below centre, with room ahead in the direction of travel.
- **Vehicles are modelled to be read from above and look like painted metal.** They have
  oversized, chunky parts, bevelled edges that catch a highlight, and colour that darkens
  low down and varies slightly from face to face. There is no glossy white highlight.
  Every model gets an ink outline where it meets the ground.
- **Game controls are round, chunky thumb buttons, not form buttons.** Each has an icon
  face, a dark lip underneath that presses down, and a short uppercase label. The main verb
  is big (about 96 px) in the bottom-right thumb spot. The second verb is smaller and sits
  up and to its left. A ring round the face shows charge or cooldown, and the button glows
  green while held. Gauges sit in one framed panel at the top left, with segmented bars;
  pause is a round button at the top right. The palette stays Out There's: ink, paper
  white, green for go and red for low.

> The button and gauge styling above is replaced by *Field HUD is light and flat (2026-11-21)*: flat discs, no lips, and a frosted strip instead of a dark panel.

Built in TakeOn `FieldRenderer` and the `@takeon/ui` field HUD (`tk-ot-*`).
