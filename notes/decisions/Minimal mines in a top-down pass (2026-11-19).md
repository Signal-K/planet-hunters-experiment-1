---
type: decision
title: Minimal mines in a top-down pass
project: Landnam
status: decided
created: 2026-11-19
---

# Minimal mines in a top-down pass (2026-11-19)

Decided by Liam, SSL-865. Landnam's sideways mining scene does not work on an upright phone:
the narrow side of the screen is the look-ahead (about two deposits), the tall side is sky
the beam has to cross, and the controls take a quarter of the height.

## Decision

- **Landnam Minimal has its own mining scene**, `minimal/src/MineScene.tsx`, sketch A of
  `docs/scene-monitor/mining-portrait-sketches.html`. This replaces "Mining is Landnam's own
  mining scene, unchanged" in
  `Landnam Minimal is a separate game at playlandnam.space-minimal (2026-11-19).md`.
- **Top-down pass:** the camera looks straight down and the ground flows down the screen
  under the ship, so the phone's tall side is look-ahead (about 4 s). The laser hits a
  reticle just ahead of the ship at once; there is nothing to lead.
- **Drag anywhere to steer**, no d-pad. SCAN and FIRE sit bottom-right, the order
  bottom-left. On a keyboard: arrows steer, Space fires, S scans.
- **Scan before you mine** (`You scan before you mine (2026-11-19).md`): deposits arrive as
  "?" and FIRE only cuts the ones a scan has shown.
- It plays the same mission Landnam would: the order is the mission's `requires.minerals`,
  ore and colours come from `MINERAL_META`, laser level 2 minerals show as dim seams the
  starting laser cannot cut, and the ground is the body's terrain look.
- Portrait first. Landscape and desktop keep a phone-width lane in the middle, and turning
  the phone mid-run keeps every deposit where it was.

## Not decided here

- The shower run chapter keeps Landnam's mining scene until the pass learns CATCH.
- Landnam's own mining scene and its shared controls with the rover are unchanged; only the
  scan rule moves there.
