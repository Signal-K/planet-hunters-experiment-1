---
type: decision
title: Field vehicles use Landnam's models
project: Landnam
status: decided
created: 2026-11-21
---

# Field vehicles use Landnam's models (2026-11-21)

Decided by Liam on KES-543: "Make sure for the vehicles we're using the same models, or at
least something that is similar, that Landnam uses."

## Decision

- **A vehicle looks the same in every scene.** A new view of a vehicle draws the same
  vehicle in new form. It does not invent a new one.
- **The rover is the player's rover build.** Landnam's rover is TakeOn's `RoverSpec`
  (chassis, wheels, power, modules, colour), drawn by TakeOn's iso painter. The 3D field
  rover is built part for part from that same spec:
  - the hull in the build's colour;
  - wheels or tracks;
  - solar wings or an RTG;
  - a camera mast, a scanner whip, a tool arm and a cargo bed when fitted;
  - the tank, dish, charge strip and beacon on every build.

  A part you fit in the garage shows up in the field. There is no orange on the rover.
- **The mining ship is Landnam's miner:** a cream hull with blue stripes, a blue-framed
  cockpit, a grey nozzle and landing legs (`laser/ship.png`, the minimal mine pass).
- **New vehicles get their look from the Landnam art first,** and any other scene follows it.

## Where it lives

TakeOn `packages/engine/src/field/meshes.ts` (`buildRover(look)`, `buildShip`) and
`field/look.ts` (`roverLookFromSpec`). Code: TakeOn 42222cc.
