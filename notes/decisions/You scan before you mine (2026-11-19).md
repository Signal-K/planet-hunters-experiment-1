---
type: decision
title: You scan before you mine
project: Landnam
status: superseded
created: 2026-11-19
---

# You scan before you mine (2026-11-19)

> 2026-11-21: replaced by `Only probes scan (2026-11-21).md`. Rockets and rovers never scan; the probe already mapped the seams.

Decided by Liam, SSL-865, while reviewing the portrait mining sketches: "you MUST scan the
location/target before you can mine".

## Decision

- **The laser only cuts a deposit that has been scanned.** In every laser mining run, in
  Landnam and in Landnam Minimal, deposits start unknown. SCAN reads the ground ahead and
  shows what each deposit is; FIRE then cuts the ones it showed. FIRE at an unscanned deposit
  cuts nothing and says "Scan it first". It costs nothing, so a curious press is never
  punished.
- SCAN is the run's second button, beside FIRE, where CATCH sits in a shower run (the
  general second action from SSL-711). It has a short cooldown and reaches the deposits ahead
  of the ship, not the whole field, so a run is scan, aim, fire, and scan again.
- The tutorial teaches it in that order: scan the ground ahead, then fire at what the scan
  found.
- This replaces "Scanning never gates mining" from
  `Mining missions follow one scene flow (2026-10-29).md`.

## Not decided here

- Launching is not gated: a mission can still fly to a body nobody has surveyed, and the
  scan happens on site. Whether a launch should first need a probe survey of the body is open.
- Rover mining (signal-k/takeon) keeps its own SCAN; this note does not change it.
