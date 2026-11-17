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

## Liam's follow-up (17 Nov, later)

- Some missions launch to upgrade or repair a craft. Craft are not set-and-forget.
- The game should be more abstract, so that community research is actually useful and still gives the citizen
  science contribution. We already know how the game works behind the scenes, so research that only reveals our own
  rules is not useful. Everything the player does needs a reason.

## Proposed by the agent, waiting on Liam: the world is what the community finds

The reason for everything: nobody, the developers included, knows the answers yet. Landnam's universe beyond the home
system is not authored. It is made from what players conclude together about real data.

1. **Real data in, worlds out.** When community consensus says a TESS candidate is a planet, it becomes a world in
   Landnam for everyone, built from the real fit (size, orbit, temperature). Confirmed asteroid candidates become
   mining targets. Saturn storm frames set the weather for Saturn missions. Meteor echoes set how dense a shower's
   debris is. Today a player's own "planet" verdict only makes a target for that player.
2. **Surveys are shared.** What a world holds is unknown until probes map it. Every probe reading fills in the same
   map, so the community charts the worlds it created.
3. **Craft wear and get serviced.** Real space weather (solar storms, which ties in with answer 3) wears craft
   down, and a worn craft brings less data. A servicing mission repairs it. Small upgrades ride along on servicing
   missions; a big performance upgrade is its own mission.
4. **Spare capacity is donated.** Data you can't work goes to the community queue, so candidates reach consensus
   sooner and new worlds appear sooner.
5. **Community research is the frontier.** In place of the flat 100-stamp bar it shows what the community is close
   to deciding: candidates near consensus, worlds still unmapped, and craft that need servicing.

Why it is useful:
- For science: consensus classifications of real data, which is the citizen science output.
- For us: which worlds players choose to settle, and how quickly a community reaches agreement, tell us how the game
  is played.

## Not yet

- iOS: the `launch` stamp kind and the Agency path are web only. iOS still keeps only the seven older stamp kinds.
