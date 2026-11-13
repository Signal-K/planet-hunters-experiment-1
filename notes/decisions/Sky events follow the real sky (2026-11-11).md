---
type: decision
title: Sky events follow the real sky
project: Landnam
status: decided
created: 2026-11-11
---

# Sky events follow the real sky (2026-11-11)

Decided by Liam on SSL-831.

## Decision

- What event comes next depends on what is happening in the real sky. Landnam does not invent
  event types to fill the calendar. So far the only special event that has run is the Orionids;
  the Leonids are the next real one.
- A shower event runs on that shower's real activity window, not just its peak day. The Leonids
  run 6 to 30 Nov 2026 (IMO), peaking on 17 Nov; gold during the window, silver after.
  `SkyEvent` and its debris preset use the same dates as `shared/scenes/sky-events.json`.
- iOS work waits until Liam asks for it (11 Nov).

## The Leonids set

- Mission 1, **Leonids shower run**: catch 20 Leonid fragments. It hands over the Leonid fragment
  sample, and the community launches LEO-1.
- Mission 2, **Listen on LEO-1**: check 3 real BRAMS recordings, counted from when the run came
  home. It hands over the radio confirmation and grades the badge.
- The Events board card names the next mission and starts it; the Community research step names
  it too and counts missions (1/2, then done); LEO-1 sits in the Control Station.
- Code: `TwoStepChain` and `LEONIDS_CHAIN` in `web/lib/orionids/chain.ts`, state in
  `player.showerChains`. A later shower (Geminids) is one more chain entry.
