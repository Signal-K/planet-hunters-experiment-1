-- Migration: Indexes and RLS for game-driven TESS classifications
-- Purpose: The Landnám game inserts TESS lightcurve classifications
--   using the anon key. This migration ensures efficient querying and
--   documents the expected data shape.
--
-- classificationtype used by the game: 'tess-lightcurve'
-- classificationConfiguration shape:
--   {
--     "verdict": "planet" | "not_planet",
--     "annotation_count": <int>,
--     "annotations": [...stroke data...],
--     "source": "landnam-game",
--     "game_session": "<uuid>"
--   }
--
-- Run with Supabase service role key.

-- Index for fast lookup of all tess-lightcurve classifications
CREATE INDEX IF NOT EXISTS idx_classifications_tess_lightcurve
  ON classifications (anomaly, classificationtype)
  WHERE classificationtype = 'tess-lightcurve';

-- Index for per-anomaly classification counts (used to show community progress)
CREATE INDEX IF NOT EXISTS idx_classifications_anomaly
  ON classifications (anomaly);

-- Ensure anon role can INSERT into classifications (game submits as anon)
-- Note: RLS must be enabled on the table for this to apply.
-- If RLS is not enabled, all roles have full access already.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'classifications' AND c.relrowsecurity = true
  ) THEN
    -- RLS is enabled: ensure anon insert policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'classifications'
        AND policyname = 'anon_insert_classifications'
    ) THEN
      EXECUTE 'CREATE POLICY anon_insert_classifications ON classifications
        FOR INSERT TO anon
        WITH CHECK (true)';
    END IF;
  END IF;
END $$;

COMMENT ON INDEX idx_classifications_tess_lightcurve IS
  'Supports Landnám game queries for TESS citizen science classification counts per anomaly';
