---
type: decision
title: Only probes scan
project: Landnam
status: decided
created: 2026-11-21
---

# Only probes scan (2026-11-21)

Decided by Liam on KES-543, after seeing a Scan button on the mining ship: "Rockets don't scan. Probes do. You have
to send a probe to a target to scan it, to be able to know details about it that help you design rockets for it.
Why would you be scanning it when you're already there?" He asked for the fix across the whole ecosystem.

Replaces `You scan before you mine (2026-11-19).md`.

## Decision

- **Scanning is what a survey probe does.** You fly a probe to a body and release it into orbit, and it maps the
  body's sectors on its own (`Basic probe scan is automatic; scan levels in cycle 11 (2026-11-12).md`). What it
  finds (minerals, seams, tonnes) is what you design a rocket for.
- **Rockets, ships, landers and rovers never scan.** No SCAN button, no geoscan beat, no scan pulse or sweep, no
  "?" deposits and no "Scan it first", anywhere: Landnam web, Landnam Minimal, iOS and TakeOn's field.
- **On site, the seams are already known.** A mining run starts with the probe's seams shown: the laser run draws
  every seam with its mineral, the TakeOn field puts them on the ground from the first frame (`surveyed`), and FIRE
  or a rover order cuts them. A contract's seams come from the body's probe survey.
- Mission templates follow it. Mining templates have no Survey beat. An exploration contract and a probe
  follow-up fly a probe (vehicle `probe`): release it, let it map, hand in its readings. The old "Mapping scan"
  primer is a Probe survey.

## Not decided here

- Whether a mining launch should need your own probe on the body first. Today a run can still fly to a body you
  have not probed; its seams are shown all the same.
- Feeding the probe's own sector map into which seams a run shows (today every seam in the run is shown).
- Showing the probe's finds in the rocket designer.
