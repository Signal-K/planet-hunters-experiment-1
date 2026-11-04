---
type: decision
title: Community votes set the next build, and mission types build the site
project: Landnam
status: decided
created: 2026-11-04
---

# Community votes set the next build, and mission types build the site (2026-11-04)

Decided by Liam while planning SSL-757 (votes) and its follow-ups SSL-758 to SSL-761.

## Decision

- Community research has two votes: a sky vote (what to observe next) and a launch vote (which launch to follow next).
  A vote sets the policy for what the community builds after it closes. Each ballot option names a project template
  (`observatory-instrument` or `spaceport-launch-site`).
- The launch vote is for the launch **after** the one already being followed. Electron "The Mountain God Rises"
  is the default for now. The launch vote opens only when the next launches have operator-confirmed dates.
- Sky options come from the same sources Atlas uses (Astronomy Engine, IMO calendar) and are checked against a second source.
- The shared Spaceport and Observatory is one project with one bar. It is built the way community research is already
  done: components fed by mission types (mining hauls, contract runs, launching a payload, classifications). Players keep
  everything they mine; the credit is a copy, never a deduction.
- Players who arrive after an event are not locked out. After it closes they can pay research fragments to unlock a copy
  of the mission and earn the silver badge. The reward for community research is being able to do more community missions.
  No new currency.
- iOS parity for all of this waits for cycle 9.

## Where

`pocketbase/ballots.go`, `web/lib/community/ballots.ts`, `web/components/game/screens/CommunityBallots.tsx`.
Follow-ups: SSL-758 site ledger, SSL-759 scene, SSL-760 real-world schedule, SSL-761 silver replay.
