---
type: decision
title: Basic probe scan is automatic; scan levels in cycle 11
project: Landnam
status: decided
created: 2026-11-12
---

# Basic probe scan is automatic; scan levels in cycle 11 (2026-11-12)

Liam, on SSL-773: "At the start it should just be something the satellite does, like in Tiny Space Program. Then there are multiple levels where users may have to do an activity or task. Keep it simple for now, then let's add levels in Cycle 11. There should be enough minerals (quantity, and range of types) that can be discovered with a basic scan - these just take time."

Replaces the reading/marking part of `Survey probes stay in orbit and map deposits (2026-11-11).md`.

## Decision

- The basic scan needs no player activity. A probe in orbit maps one sector of the body's 6 by 4 map every
  2 hours on its own (`PROBE_SECTOR_HOURS`), so the whole body is mapped in two days.
- A basic scan finds every mineral type the body holds (4 to 10 per body) and how many tonnes each sector holds.
  Scarcer minerals come in smaller seams: common 400–1,400 t, uncommon 150–600 t, rare 20–140 t, exotic 5–45 t.
- The probe console shows the map filling in, the sector being mapped now, the time until the next one, and every
  mineral found with its total tonnes. Tapping a mapped sector shows what it holds.
- Opening the console downloads the sectors mapped since the last visit. That download is the **probe
  observation**: a `probe-observation` stamp (once a day), a ledger row and a count toward the community bar.

## Cycle 11

- Scan levels where the player does an activity or task. The reflectance spectrum (`sectorSpectrum`,
  `bodyBands`) stays in `web/lib/probes/survey-probe.ts` for them.
- Any multi-step level console follows `Long consoles split into step pages (2026-11-12).md`.
