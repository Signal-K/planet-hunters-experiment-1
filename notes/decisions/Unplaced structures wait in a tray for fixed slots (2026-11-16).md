---
type: decision
title: Unplaced structures wait in a tray for fixed slots
project: Landnam
status: decided
created: 2026-11-16
---

# Unplaced structures wait in a tray for fixed slots (2026-11-16)

Decided by Liam (iPad, 16 Nov) after a ground telescope he owned never appeared on the Base. Ticket: SSL-843.

## Decision

- A structure the player owns but has not placed waits in an **Unplaced** tray on the Base, like rooms in Pixel Starships.
  Nothing a player owns is ever invisible.
- Placing works like trees in Void Pets: there are real, fixed slots for it to go into. Tap the item in the tray, the free
  slots light up, tap one. No free-form placement.
- Placing from the tray is free; the price was paid when the structure was built or bought.
- Small structures stand in **annex slots** (`shared/layout/base-site.json` → `annexSlots`), two at the Base's west end
  for now. The ground telescope is the first annex structure. Main structures keep their one home site each.
- Anything that gives the player a structure from outside the Base (the Data hub, a reward, a gift) sends it to the tray.
