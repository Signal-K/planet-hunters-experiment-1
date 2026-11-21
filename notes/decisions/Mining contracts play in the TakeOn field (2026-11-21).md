---
type: decision
title: Mining contracts play in the TakeOn field
project: Landnam
status: decided
created: 2026-11-21
---

# Mining contracts play in the TakeOn field (2026-11-21)

Decided by Liam on KES-543: "connect it all back to Landnam", after the 3D field, tap-to-drive rover, real terrain, Landnam vehicles and the flat HUD were built in TakeOn.

## Decision

- **A mining contract's cut and mine beats play in TakeOn's 3D field** (`@takeon/engine/field`), not the 2D side-scroller. The method follows the fit-out: a ship with a lander module lands and mines with the rover (tap the ground or scanned ore); without one the ship cuts from orbit on a low pass (scan, slide over the seam, hold the laser). The rover run then lifts off through the existing redock scene; the orbit run goes straight to the trip home.
- **The order drives the field.** The ordered mineral is the first seam a short drive from the landing, the hold has a size, and the laser stops when it is full. The order and hold are the only gauges; a green finish button appears when the order is met or the hold is full. Ore uses Landnam's mineral colours.
- **Mars and the Moon use real terrain**, credited on screen; other bodies take the field look for their archetype (carbon, metal, ice, regolith).
- **The 2D scene stays for three cases:** the onboarding mining try (its guide is built on it), meteor-shower runs (catch rules) and free hauls (the store-or-sell gate, KES-283) until those move over.
- The field's HUD is Landnam's, following *Field HUD is light and flat*: Menu is the only top-right control, as in every mining scene.

Built in `web/components/game/screens/FieldMiningScreen.tsx`, routed from `MissionOperationRoutes`, fixtures `ui-field-orbit` and `ui-field-rover`. iOS keeps the 2D scene for now.
