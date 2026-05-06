-- Migration: TESS disposition and lightcurve metadata fields on anomalies
-- Purpose: Support citizen science classification loop in Landnám game.
--   Players view TESS planet candidates, annotate lightcurves, and submit
--   classifications. tess_disposition distinguishes candidates (PC) from
--   confirmed planets (KP/CP) and false positives (FP/EB/etc).
--
-- Run with Supabase service role key.

-- Add TESS ExoFOP disposition column (PC = planet candidate, KP/CP = confirmed, FP = false positive, etc.)
ALTER TABLE anomalies
  ADD COLUMN IF NOT EXISTS tess_disposition TEXT DEFAULT NULL;

-- Add TESS observation sector (1-96+) for science blurb display
ALTER TABLE anomalies
  ADD COLUMN IF NOT EXISTS tess_sector INTEGER DEFAULT NULL;

-- Add year TESS first observed this target, for science blurb display
ALTER TABLE anomalies
  ADD COLUMN IF NOT EXISTS tess_year INTEGER DEFAULT NULL;

-- Index for fast candidate lookups (game fetches PC targets for classification UI)
CREATE INDEX IF NOT EXISTS idx_anomalies_tess_disposition
  ON anomalies (tess_disposition)
  WHERE tess_disposition IS NOT NULL;

-- Backfill: mark all existing telescope-tess anomalies as PC (planet candidate)
-- by default, since we have no disposition data for them yet.
-- This can be updated later via ExoFOP data import.
UPDATE anomalies
  SET tess_disposition = 'PC'
  WHERE anomalySet = 'telescope-tess'
    AND tess_disposition IS NULL;

COMMENT ON COLUMN anomalies.tess_disposition IS
  'TESS ExoFOP disposition: PC=Planet Candidate, KP=Known Planet, CP=Confirmed Planet, FP=False Positive, EB=Eclipsing Binary, V=Variable Star, O=Other';

COMMENT ON COLUMN anomalies.tess_sector IS
  'TESS sector (1-96+) in which the target was observed';

COMMENT ON COLUMN anomalies.tess_year IS
  'Year TESS first observed this target';
