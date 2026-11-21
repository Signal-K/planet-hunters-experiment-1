---
type: decision
title: Field HUD is light and flat
project: Landnam
status: decided
created: 2026-11-21
---

# Field HUD is light and flat (2026-11-21)

Decided by Liam on KES-543, after reviewing the field HUD: "Don't like the buttons,
they're too bulbous. And the top UI is too black." This replaces the button and gauge
styling in *Portrait 3D looks steeply down, with round thumb buttons*. The camera and
vehicle parts of that note still stand.

## Decision

- **Thumb buttons are flat discs.** Each is one solid tone with a white line icon and a
  single soft shadow. There is no gradient, bevel, highlight, ink outline or dark lip.
  Pressing scales the face down slightly rather than dropping it onto a lip.
- **Buttons are compact.** The main verb is about 76 px, in the bottom-right thumb spot.
  The second verb is about 60 px, up and to its left. Both stay above the 44 px tap
  minimum. A short uppercase label (14 px) sits under each.
- **Charge or cooldown is a thin ring** round the face. It fills white, clockwise, over a
  faint track. A held button turns green with a soft pulse.
- **No black plates over the terrain.** Gauges sit in one frosted, see-through strip at
  the top left: a light tint, background blur, a thin white edge and a soft shadow. Each
  row has a tone-coloured line icon, a label, a slim rounded bar and a value. A bar blinks
  red when low. Pause is a frosted round button (44 px) at the top right.
- **The ground shows through the HUD.** Text sits on the scene with a soft shadow rather
  than on a dark box.

Built in the `@takeon/ui` field HUD (`tk-ot-*` in `packages/ui/src/styles.css`).
