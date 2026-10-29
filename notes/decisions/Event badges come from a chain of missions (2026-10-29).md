---
type: decision
title: Event badges come from a chain of missions
project: Landnam
status: decided
created: 2026-10-29
---

# Event badges come from a chain of missions (2026-10-29)

Decided by Liam on the Orionids (SSL-714). Extends
[[Live events - unlocks, per-shower fragments, no events for their own sake (2026-10-22)]].

## Decision

- A shower badge is earned by finishing a chain of three missions joined by story items, not by
  mining. For the Orionids: the shower run brings back a **fragment sample**, the rover
  observation on Eros finds the **impact bearing** and the community launches ORI-1, and three
  recordings checked on ORI-1 give the **radio confirmation**. The badge is graded then
  (gold in the event window, silver after).
- Each debrief hands over the story item and points at the next mission on the Events board.
- Every chain feeds Community research: the event step names the player's next mission, and
  the history shows the story items collected.
- The chain is reusable per shower (`web/lib/orionids/chain.ts`, `ShowerChain`).

## Open

- iOS still grants the badge on the first chunk and has no ORI-1 screen (parked to the week of
  2026-11-02).
