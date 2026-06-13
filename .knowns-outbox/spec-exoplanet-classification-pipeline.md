# Spec (Draft): Real-Data Exoplanet Classification Pipeline

**Status:** Draft — decisions needed before implementation
**Owner:** @user

## Goal

Replace the current single-hardcoded-candidate, synthetic-lightcurve
"Classify Signal" screen (`ClassifyLightcurveScreen.tsx`,
`LightcurvePlot.tsx`) with a pipeline that:

1. Serves real TESS transit-candidate lightcurves to players.
2. Captures verdicts in a way that produces a real, measurable scientific
   output (consensus classifications, accuracy against known answers).
3. Presents a mobile-first, swipe-based UI (portrait canvas, 8pt rhythm,
   no dense annotation toolbars).
4. Feels like part of the game loop — both as a mission gate
   (`requiresClassification`) and as a recurring optional activity via the
   Satellite Uplink mechanic (`researchAnnotations` -> payout boost).

## Proposed Architecture

```
[Offline prep]  TESS TCE lightcurves (MAST/Lightkurve)
                  -> downsample to ~200-500 pts
                  -> store in `subjects` collection (lightcurve_points,
                     period, depth, TIC id, sector, subject_type,
                     is_calibration, gold_label)

[Runtime]       GET /api/subjects/next?type=transit&user=X
                  -> returns 1 subject not yet seen by user,
                     weighted toward subjects with fewer votes
                  -> client caches a small batch (5-10) for offline-first swipe

[Client]        Swipe-based ClassifyLightcurveScreen
                  -> POST classification (subject_id, user, verdict,
                     confidence, response_time_ms)

[Aggregation]   Scheduled job: consensus per subject (majority vote +
                  Beta-distribution confidence once N >= 5 votes),
                  accuracy check against `gold_label` for calibration subjects

[Output]        "Research Log" stat in-game: cumulative real classifications,
                  consensus results export (CSV/JSON)
```

## Decisions Needed

### 1. Data sourcing — who runs the offline TESS prep job, and where does it live?
- Options: (a) a one-off script in `scripts/` run manually and committed as
  static JSON seed data (~50-100 subjects, simplest, no ongoing infra);
  (b) a recurring job (cron/Action) that refreshes the subject pool
  periodically.
- **Recommendation:** (a) for launch — a `scripts/fetch-tess-subjects.py` (or
  Node + lightkurve-equivalent) that produces a static
  `pocketbase/seed/subjects.json`, loaded via `seedCatalog()`-style seeding in
  `main.go`. Revisit (b) only if the subject pool needs to grow beyond a
  one-time seed.

### 2. Where does `subjects` / classification data live?
- See `decision-classifications-backend-target.md` — recommend Landnam
  backend (8091/8093) unless cross-app reuse is a near-term goal.

### 3. Calibration subject ratio
- What fraction of the served subject pool should be `is_calibration: true`
  (known confirmed planets / known false positives from NASA Exoplanet
  Archive) vs. real unclassified TCEs?
- **Recommendation:** ~20% calibration. Enough to compute a meaningful
  per-player accuracy score without the deck feeling repetitive, and without
  telling the player which subjects are calibration (avoids gaming).

### 4. Verdict granularity
- Current: binary `planet` / `not_planet`.
- Proposed UI adds a third "not sure / noisy" option via tap-and-hold.
  Confirm: keep it strictly binary for v0 (matches existing PB `select`
  field), or add `unsure` as a third value now (schema change either way
  since we're introducing a new collection per decision doc #1)?
- **Recommendation:** add `unsure` now — costs nothing in the new collection
  and is scientifically useful (Zooniverse-style "don't know" responses help
  calibrate task difficulty).

### 5. Reward mechanism / economy tuning
- Current `onSatelliteClassify` gives a flat "+1% payout per planet
  annotation" via `researchAnnotations`. With real subjects and an
  `unsure` option:
  - Does `unsure` still count toward `researchAnnotations`?
  - Should accuracy on calibration subjects affect the reward (e.g. bonus for
    correct verdicts on gold-label subjects), or keep it participation-based
    only (reward for classifying, not for being "right")?
- **Recommendation:** participation-based for all verdicts including
  `unsure` (keeps it low-pressure / non-punishing), but track accuracy
  separately for the in-game "Research Log" stat and for weighting consensus
  — i.e. reward != scoring.

### 6. UI rebuild scope for `ClassifyLightcurveScreen`
- Confirm the swipe interaction model before I build it:
  - Swipe right = "Planet-like dip", swipe left = "No transit", tap-and-hold
    (or a small button) = "Unsure"?
  - Pinch/drag-to-zoom on the lightcurve chart — required for v0, or can ship
    without zoom first and add later?
- **Recommendation:** ship swipe verdicts + static (non-zoomable) chart for
  v0; add pinch-zoom as a fast-follow once real data is flowing (zoom is a
  rendering-perf concern worth isolating from the data-pipeline change).

## Out of Scope for This Spec (tracked separately)

- Radial velocity classification task
- Transit timing variation (TTV) follow-up task
- Spectroscopy ("atmospheric analysis") minigame

See `decision-rv-spectroscopy-roadmap.md` for those.

## What I Can Start On Now (no decisions blocking)

- Fix/clarify the `classifications` backend question is blocking (see other
  doc), but I *can* start scaffolding independent of that:
  - A `scripts/fetch-tess-subjects.py` draft that pulls a small batch of real
    TESS TCEs + metadata via the MAST API / lightkurve, producing the
    `subjects.json` shape described above (no PB writes yet — just data prep
    I can validate locally).
  - A static-data version of the swipe UI (`ClassifyLightcurveScreen`
    redesign) that reads from a local JSON fixture instead of PB, so the
    mobile UX can be reviewed/tested independent of the backend decision.

Let me know if you'd like me to start on either of those now while you decide
the open questions above.
