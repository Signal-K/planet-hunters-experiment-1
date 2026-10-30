---
type: decision
title: Each sky event has a community instrument
project: Landnam
status: decided
created: 2026-10-29
---

# Each sky event has a community instrument (2026-10-29)

Decided by Liam (SSL-714).

## Decision

- For each sky event the community launches one shared instrument, the way a player launches
  their own telescope for a long-running project. Players view its data and classify it.
- Each has a callsign and a name: DRA-1 (Draconids), ORI-1 (Orionids), LEO-1 (Leonids),
  GEM-1 (Geminids). Data: `SkyEvent.communityInstrument` in `web/lib/data/sky-events.ts`.
- ORI-1 listens to the BRAMS beacon (49.97 MHz) through Radio Meteor Zoo on Zooniverse.
  Classifications stay on Landnam's side.

## Open

- Add the community instruments to the control station's instrument list.
