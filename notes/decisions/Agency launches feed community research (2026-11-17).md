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

## Proposed by the agent, not yet decided by Liam

- Launches stay on offer after the first one, and the Program tab says which project each opens.
- Contributions carry their project, so community research can show a goal per project.
- Community goals launch the community instruments (ORI-1, LEO-1), and a finished Community Site gives every
  player something to launch.

## Not yet

- iOS: the `launch` stamp kind and the Agency path are web only. iOS still keeps only the seven older stamp kinds.
