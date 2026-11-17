---
type: decision
title: Agency launches feed community research
project: Landnam
status: decided
created: 2026-11-17
---

# Agency launches feed community research (2026-11-17)

Direction from Liam (17 Nov, SSL-852): the data flow, the Data hub, launched probes and telescopes, missions and
community research were disconnected. Players launch things as part of their space agency, such as telescopes. Each
launch brings extra data and a citizen science project to contribute to, and that work feeds community events and
community research.

## The loop

1. The agency launches or builds a craft.
2. Every craft carries a citizen science project and a daily amount of data.
3. Working that data is a contribution to the project.
4. Contributions fill the community goals.

## Built so far (slice 1)

- One model lists every craft with its projects, data a day and contributions: `web/lib/agency/programme.ts`.
  New surfaces read it instead of the save flags.
- Putting a craft up is research: a `launch` stamp when a telescope, satellite or probe is launched, or a ground
  telescope is built. It counts on the monthly community bar and goes to the Garden ledger.
- The Agency path in Community research is open. Its steps come from the programme.

## Liam's answers (17 Nov)

1. **More craft and upgrades.** Upgrades add small improvements. A player can also launch more craft and donate the
   extra capacity, or buy a substantial performance upgrade. Launches stay on offer after the first one.
2. **Community research has an abstract goal.** It should tell us about the game as a whole: its mechanics, how its
   world is made and who plays it. The model is No Man's Sky, where players' research improves the developers'
   understanding of the game's own generation. There is no goal per project.
3. **Real-world events set the timing.** A mission or instrument tied to a real event goes up while that event is
   happening. The shower receivers (ORI-1, LEO-1) go up on their shower's real start date, not when a player's own
   mission ends, and keep listening afterwards. The badge chain still asks for the shower run before its recordings.

## Built for answer 3

- `communityTelescopes(player, now)` puts a receiver up from its shower's `startUtc`. Saves that opened it through a
  mission keep it.
- While a chained shower is live, the radio desk tunes to its receiver.
- Two receivers up at once stand apart on the Data hub horizon.

## Not yet

- iOS: the `launch` stamp kind and the Agency path are web only. iOS still keeps only the seven older stamp kinds.
