---
type: decision
title: Rover and laser mining share one control setup
project: Landnam
status: decided
created: 2026-10-30
---

# Rover and laser mining share one control setup (2026-10-30)

Liam: "Try and create a uniform control setup between the mining laser scenes and the takeon. So dpad,
buttons, etc."

## Decision

- Every mining scene, laser or rover, uses the same controls from `MiningControls.tsx`: one Menu button
  top-left, the d-pad bottom-left, one big round action button bottom-right, a second round button up
  and to its left, and the progress pill between them, which turns into Return when there is something
  to bring home.
- On the rover the round button is DRILL, and its ring is the battery. The second button is SCAN. The
  menu is the laser mining menu (Resume, Return to hub, Settings, How to play).
- The shared HUD (settings cog, francs, clock, cargo chip) and the white word dock are gone from the
  rover field, as they are from laser mining. The Orionids sky overlay stays off it too.
- A new mining-style scene reuses these components rather than adding its own buttons.
