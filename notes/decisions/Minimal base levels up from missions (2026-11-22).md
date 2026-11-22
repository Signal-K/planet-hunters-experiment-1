---
type: decision
title: Minimal base levels up from missions
project: Landnam
status: decided
created: 2026-11-22
---

# Minimal base levels up from missions (2026-11-22)

Decided by Liam for Landnam Minimal: "Rather than users building and upgrading structures, I propose that users
start with basic structures, all at level 1, and then these upgrade when they complete missions. They can see a
counter in each structure to see the progress required. Some structures will require specific mission types. I
don't want to go away from an agency sandbox."

Replaces Minimal's numbered chapter route and START button as its home screen.

## Decision

- **Home is the agency's base.** Four structures stand on it from the start, all at level 1: Launchpad, Exchange,
  Control Station and Hangar. Nothing is built or bought.
- **Missions level the structures.** Each structure shows its level and a counter (`2/3`) of what its next level
  needs. The Launchpad counts every mission; the Exchange counts mining runs, the Control Station orbit launches
  (satellites and probes), the Hangar hauls and builds.
- **A level gives something.** New missions (Exchange, Control Station, Hangar), a bigger rocket with more hold and
  reach (Launchpad: Explorer, Prospector, Surveyor) or better gear (Hangar: laser tiers). Tapping a structure shows
  every level and what it gives.
- **The sandbox stays.** Every unlocked mission can be flown again at any time, in any order, from the tray; market
  runs go to any world the rocket reaches. One big NEXT button names the mission that moves the base forward
  soonest (a mission never flown first).
- Levels are derived from run counts every time, never stored (`minimal/src/structures.ts`).

Why: an always-visible goal with progress already started reads better for a new player than an empty build menu
(endowed progress, Nunes & Drèze 2006), and it mirrors how a space agency game grows its centre by facility
levels (KSP's Space Center) without asking for build decisions up front.
