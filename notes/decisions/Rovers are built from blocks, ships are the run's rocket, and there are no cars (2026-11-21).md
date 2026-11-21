---
type: decision
title: Rovers are built from blocks, ships are the run's rocket, and there are no cars
project: Landnam
status: decided
created: 2026-11-21
---

# Rovers are built from blocks, ships are the run's rocket, and there are no cars (2026-11-21)

Decided by Liam on KES-543, after the field vehicles: "There are no cars in Landnam. Find
all code saying there is and remove it all. The rovers just look really fat in these
drawings. Look at the blocks in Haphazard Martians and go along with something more in
that template/layout. Landnam has dedicated rocket types, though, there's more than just one."

## Decision

- **There are no cars in Landnam.** No vehicle has a cab, windows, a bonnet or a road to
  drive on, and nothing is ambient road traffic. Ground vehicles are rovers. The side-on
  `road_rover` sprite (a pickup with a cabin) and the Earth Base `RoadRover` traffic are
  removed; iOS's prospecting field draws `actors/rover.png`.
- **Rovers are built from blocks, the Haphazard Martians way.** A rover is parts on a 1 m
  grid: bolted hex nodes on the grid points, thin girders between neighbours with a
  diagonal in each bay (the triangle block), wheels hanging off the end columns, and a blue
  Navcam mast on the front. Each fitted part is one block in one bay: the build's colour
  is a single avionics box, solar is a flat panel over a bay (not wings), and cargo is an
  open bay with crates. The frame stays open and narrow, never a solid hull or car body.
- **The ship is the run's own rocket.** Landnam has rocket types, and a scene that shows
  the ship shows the one being flown: the Explorer (pale blue, green stripe, three
  portholes, one long pod a side), the Prospector (cyan stripe, four portholes, two pods
  a side) or the Surveyor (the heavy dark-grey hull with bumpers, steel bands, a cyan light
  line and amber lights). Unannounced tiers fall back to the Explorer.

> This replaces the rover body and mining-ship lines of *Field vehicles use Landnam's
> models (2026-11-21)*. Its first rule still holds: a vehicle looks the same in every scene.

## Where it lives

TakeOn `packages/engine/src/field/meshes.ts` (`buildRover`, `buildShip(kind)`,
`FIELD_SHIP_KINDS`); Landnam `web/lib/field/fieldMission.ts` (`fieldShipFor`).
