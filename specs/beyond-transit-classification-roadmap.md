# Beyond-Transit Classification Roadmap

**Status:** Confirmed sequencing
**Task:** @task-nu8v6z

## Confirmed sequencing

1. **Transit** (current) — lightcurve dip classification; pipeline described in
   `web/game-context.tsx` and the transit classification pipeline spec. This is
   the active work item. All downstream types gate on transit being resolved.

2. **TTV (Transit Timing Variations)** — cheapest reuse of existing transit
   subjects. Planned as a Tier 2 "Advanced Vetting" unlock after the transit
   pipeline is stable. Players identify timing anomalies in sequences of transit
   events, giving confirmed-planet targets additional credibility.

3. **Spectroscopy** — high wow-factor, low data volume. Tied to a player's own
   confirmed-planet targets (M3+ mission tier). Minigame: match a target star's
   spectrum to candidate absorption profiles. Sourced from curated per-star
   spectral databases rather than bulk downloads.

4. **RV (Radial Velocity)** — highest data-sourcing cost, lowest player
   priority. Must be sourced via a refreshable API (not one-off per-paper
   downloads). Deprioritised until a suitable public RV API is identified.

## Gate conditions before any beyond-transit work starts

- Transit pipeline is resolved end-to-end (data script, classification flow,
  result storage).
- Data-sourcing script exists and is tested.

## Data sourcing notes

- TTV: reuse transit subject export with multi-epoch metadata.
- Spectroscopy: curated per-target JSON; volume is low enough to commit
  directly to `backend/migrations/`.
- RV: requires a stable public API (e.g. NASA Exoplanet Archive RV endpoint).
  Do not start RV work without a confirmed refresh strategy.

## References

- `web/game-context.tsx` — classification dispatch and state
- `specs/user-flow-and-citizen-science-specification.md` — citizen science flow
- `specs/SPEC_LANDNAM_CLASSIFICATION_MIGRATION.md` — PocketBase classification schema
