---
type: decision
title: Survey probes stay in orbit and map deposits
project: Landnam
status: decided
created: 2026-11-11
---

# Survey probes stay in orbit and map deposits (2026-11-11)

> 2026-11-12: the reading, marking and 3-a-day parts are replaced by `Basic probe scan is automatic; scan levels in cycle 11 (2026-11-12).md`. The probe now maps on its own.

Decided by Liam on SSL-773 (the probe that produces probe observations is the deposit-scanning probe; the
shower-watching probe stays parked). Builds on his 9 Nov direction on SSL-771.

## Decision

- A survey probe is flown to a planet or asteroid and released into orbit. It does not come home; the ship
  flies back empty. The Program tab offers probes to the two nearest bodies without one.
- A probe in orbit is a data hub instrument. It sends 3 surface readings a day, one sector of the body's
  6 by 4 map each.
- A reading is a reflectance spectrum. The player sweeps it with the BAND dial, matches the dips to the
  reference bands of the body's minerals and marks what they see. The console never marks anything for them.
- Logging a reading is a **probe observation**: a `probe-observation` research stamp (once per day, like every
  stamp), a `platform_contributions` row through `pocketbase/ledger_report.go`, a count toward the community
  bar, and that sector's real deposits drawn on the body's map.
- Community research shows "Log a probe reading" on both paths, before the Breakthrough, once a probe is up.

## Not yet

- The deposits found do not yet change mining on that body (where ore sits, or yield). They are shown on the
  probe's map.
- iOS waits until Liam asks for it.
- Garden needs no change: its `CONTRIBUTION_KINDS` only guards the rows Garden itself writes.
