---
type: decision
title: Minimal scenery plays like a mobile game
project: Landnam
status: decided
created: 2026-11-19
---

# Minimal scenery plays like a mobile game (2026-11-19)

Liam, on Minimal's launch screen: the terrain looked wonky, and the perspective made it hard to tell which way anything
faced. A side-on horizon slice was rejected: it was too far out and threw away the 3D world.

## Decision

- Minimal is the quick-action version of Landnám. Its scenes should read like a mobile game: one place, seen
  close, with a few obvious things to tap. They are not a landscape to study.
- Keep TakeOn's 3D (isometric) world, and fix how it is drawn:
  - Calm, rolling ground: one clean tone per tile, biome edges blended, no quilt of shaded diamonds or one-block
    step cliffs.
  - Ground flat around the subject.
  - A fixed camera that does not drift, so up and down on screen always mean the same.
  - Close zoom, with buildings big enough to read as places.
- This is TakeOn KES-532: `ground: 'calm'`, a display-only `relief` and `propScale` on the iso renderer, used by
  the minimal scene. The full rover game keeps its field look.
- Next: the outpost's buildings become the quick actions (tap the pad to launch, and so on), instead of only the
  bottom button.

Replaces the scenery line in "Landnam Minimal is a separate game", which said: near-isometric 40°, drifting camera.
