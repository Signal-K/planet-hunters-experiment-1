# Decision Needed: Beyond Transit Classification — RV, TTV, Spectroscopy

## Status: Open (roadmap-level, not blocking the transit pipeline rebuild)

## Context

The transit-lightcurve classification pipeline
(`spec-exoplanet-classification-pipeline.md`) is designed so the
`subjects` schema is generic (`subject_type: 'transit' | 'rv' | 'spectra' |
'ttv'`), making these follow-on data types additive rather than a rearchitecture.

## Candidate Follow-On Tasks

### 1. Transit Timing Variations (TTV) — reuses existing transit subjects
- Task: "does this transit arrive early/late vs. the predicted ephemeris?"
- Data: derived from the *same* TESS lightcurve subjects already sourced for
  the transit task — no new data sourcing required.
- Fit: natural Tier-2 unlock ("Advanced Vetting") for players who've done N
  transit classifications.
- **Lowest-effort follow-on** — recommend doing this first if/when expanding
  beyond transit.

### 2. Radial Velocity (RV)
- Task: "does this RV-vs-phase plot show a periodic Keplerian wobble or
  noise?"
- Data: RV datasets are sparser and less uniformly available than TESS
  lightcurves (mostly per-paper/archive, not one bulk API) — sourcing is
  higher-effort.
- Fit: Tier-2/3 unlock, smaller subject pool (10-30 curated examples rather
  than 50-100).

### 3. Spectroscopy ("Atmospheric Analysis")
- Task: "does this transmission spectrum (flux vs wavelength) show an
  absorption feature consistent with [water/methane/etc.]?"
- Data: JWST/HST exoplanet atmosphere spectra via MAST — low volume, high
  "wow factor".
- Fit: rare, high-tier minigame tied to a player's *own* confirmed-planet
  targets (thematically ties into refinery/instrument-tier progression
  already in the mission system) rather than a generic recurring task.

## Decision Needed

1. **Sequencing** — confirm priority order. Recommendation: ship transit
   pipeline -> TTV (cheap reuse) -> spectroscopy (high "wow", low volume,
   tie to existing confirmed-planet targets) -> RV (highest sourcing cost,
   lowest priority).
2. **Scope for this work session** — should I draft the TTV follow-on task
   spec now (since it reuses the same data and is low-effort), or hold all
   three until the transit pipeline decisions are settled and at least
   partially implemented?
3. **Tier gating** — confirm these map to existing mission-count tiers
   (M1/M2 unlocks per CLAUDE.md progression model) rather than introducing a
   new unlock axis.

## Recommendation

Hold drafting detailed specs for these until the transit pipeline (the
blocking decisions in `spec-exoplanet-classification-pipeline.md`) is
resolved and at least the data-sourcing script exists — TTV in particular is
nearly free once that's done, so revisiting this doc at that point costs
little.
