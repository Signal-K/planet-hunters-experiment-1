# One rocket from the pad to space, and launch plays in place

Date: 2026-11-17 · Ticket: SSL-848 · From Liam's feedback on the launch and flight scenes

Liam: "Can we make sure there is consistency between the rocket assets and the different perspectives/scenes? Can we
also fix the scene immediately after launch where the scene cuts and changes for a few seconds into the rocket just
gliding over the screen?"

## Rules

- The rocket the player builds on the launchpad is the rocket in every later scene of that mission. A scene never
  swaps it for another drawing.
- Launch plays on the launchpad the player is looking at. The built rocket lifts off its own mount; the pad, the tower
  and the camera stay where they are. No second backdrop, no second rocket, no cut-away sky.
- Updated 2026-11-24 (SSL-887): flight draws the surviving upper stage directly from the authored launchpad
  sprite, preserving its nose, panel lines and ink outline. The rear-facing revolved profile hid those details
  behind a circular engine glow and did not read as the launched rocket. The sprite follows Takeon's simulated
  position and turns side-on into orbit; the procedural profile remains an image-load fallback. If the launchpad
  art changes, update the upper-stage crop and outline in `web/lib/flight/rocketSprite.ts`.
- A scene change during a mission is a fade through black between two views of the same thing, never a hard cut to
  different art.
- A flight is long enough to steer. Un-timed hops last 18 seconds, not 4.

## Still two drawings

The small pixel rocket on the Base pad (`KitRocket`, cream with a blue nose) and the large launchpad rocket (warm white,
multi-stage) are different drawings. Flight follows the launchpad rocket because that is the one the player builds and
launches. Bringing the Base pad sprite in line needs new art.
