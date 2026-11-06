---
type: decision
title: One help button per screen, sync chip in the screen's own row
project: Landnam
status: decided
created: 2026-11-02
---

# One help button per screen, sync chip in the screen's own row (2026-11-02)

Decided by Liam (annotated iPad screenshots, 2 Nov: "Two ? marks?", "Faded one in PWA?", "Overlap"; SSL-748).

## Decision

- A screen shows one "?". When a screen has its own help button, a coach folded away off its path
  stays out of sight; the help sheet replays training.
- A coach the player hides on purpose folds to an "OPS" chip, never a second "?".
- The sync chip never floats over a screen's own controls. It sits left of the francs chip, or,
  on screens with no francs chip (control station, launch pad, instrument consoles), in the
  screen's own top row beside its help button. A screen can mark another spot with `data-sync-anchor`.
- Web: `useChipSlot` in `components/game/LandnamSyncStatus.tsx`, `.flight-plan-chip[data-folded]`
  in `app/globals.css`. Check a scene with the stage's `?signed=1`, which shows the sync chip.
