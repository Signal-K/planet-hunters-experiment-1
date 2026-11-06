---
type: cycle
title: Landnam release plan
project: Landnam
status: active
created: 2026-11-06
---

# Landnam release plan

Liam, 2026-11-06: plan for the point where Landnám can be released, then spend less time
building it and more time watching people play it and building the other games.

## Release bar (what "good enough to release" means)

Landnám is the space agency: mine, sell, and settle places you discover. It is ready when:

1. A new player gets from sign-up to a first haul, a first sale and a first settlement
   without help (onboarding mission, mining, debrief, Earth sale, one settled location).
2. Community research works as the standing event (weekly paths, Orionids chain).
3. Screens work offline and sync is visible (already decided 2026-11-01).
4. It runs as the installed web PWA on a phone in portrait, and on iOS via TestFlight.
5. No new feature is needed to play for a week. Anything bigger than a small fix goes to
   another game.

Not on the bar: full base building, rover waypoint routes, solar citizen science, skill tree,
crew, treasury. These are separate games or stay planned in the Narrative Ledger.

## Cycles

| Cycle | Dates | Focus |
| --- | --- | --- |
| 8 | Nov 1–7 | Web scenes, Takeon landscapes, direction for separate games (SSL-764). Web only. |
| 9 | Nov 7–14 | iOS parity catch-up (SSL-709, 715, 690, plus cycle 7–8 web work), minimal settlements, the one-time data import (SSL-781), "tapas" scenes. Start the Takeon Go core (SSL-778) in the takeon repo. |
| 10 | Nov 14–21 | Release candidate: fix-only. Onboarding-to-settlement run on web, PWA and TestFlight. Release checklist below. Rover game scoped (SSL-777). |
| 11 | Nov 21–28 | Release and first players. Watch, do not build: read feedback, fix blockers only. Rover game starts on the Go core. |
| 12+ | | Roughly one third Landnám fixes and events, two thirds the other games (rover first, then solar). |

Dates after cycle 9 are a plan, not a promise. Move them when a cycle's real outcome says to.

## Release checklist

- Onboarding-to-settlement run played by hand on web at the three viewports.
- iOS simulator build launches the same flow; TestFlight build uploaded.
- Sign-in, offline outbox and sync chip checked on the installed PWA.
- One-time import (SSL-781) run for existing accounts.
- No open Landnám blocker in Linear; the cycle 10 list is fixes only.
- Release note written for players; the Narrative Ledger matches what ships.

## After release: how time is spent

- Landnám gets fixes, the weekly community event, new sky events, and balance from real
  play. A new feature request is judged by "is it Landnám, a separate game, or dropped".
- Watching players: find where new players stop (a PostHog funnel from sign-up to first
  settlement), read feedback, and put each finding on a ticket with its scene id.
- Other games: rover (SSL-777) first, then solar (SSL-779). They share the world, the
  narrative and Takeon (SSL-778). Landnám carries a tapas scene of each.

## Open

- Whether the release is public or invite-only first (Liam).
- A start date for the rover game if the Go core (SSL-778) runs longer than cycle 9.
