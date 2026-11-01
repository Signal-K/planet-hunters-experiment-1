---
type: decision
title: Bigger rockets are for more cargo or a farther orbit
project: Landnam
status: decided
created: 2026-11-01
---

# Bigger rockets are for more cargo or a farther orbit (2026-11-01)

Decided by Liam (Freeform board "Landnam 31/10/2026", SSL-728).

## Decision

- A bigger rocket never earns more. Bigger rockets are required for larger cargo or greater
  distances.
- So for any job, the cheapest rocket that fits is the one to fly. Rocket pickers (launch plan
  Vehicle sheet, Hangar) offer only that one. A bigger rocket reads "Not needed" with what it
  is for (more than N units, past orbit N). A rocket that cannot fly the job says which limit it
  misses (cargo, orbit, laser).
- Web: `rocketJobRoles` in `lib/rockets.ts`. iOS: `Rockets.jobRoles`.

## Open

No authored mission yet needs more than Explorer's 6U or orbit 5 on its own requirements; only a
far destination makes a bigger rocket required. Missions that need Prospector or Surveyor are
a content task.
