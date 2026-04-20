-- Migration: Allow authenticated anonymous guest sessions to write/read
-- game-driven classifications.
--
-- Why:
-- The game now signs players in anonymously via Supabase Auth before writing
-- TESS classifications. These sessions use the `authenticated` Postgres role,
-- not `anon`, so the older anon-only policy still rejects inserts in prod.
--
-- Run with Supabase service role / SQL editor.

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classifications'
      AND policyname = 'authenticated_insert_own_classifications'
  ) THEN
    CREATE POLICY authenticated_insert_own_classifications
      ON classifications
      FOR INSERT
      TO authenticated
      WITH CHECK (
        author = auth.uid()
        AND classificationtype = 'tess-lightcurve'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classifications'
      AND policyname = 'authenticated_select_game_classifications'
  ) THEN
    CREATE POLICY authenticated_select_game_classifications
      ON classifications
      FOR SELECT
      TO authenticated
      USING (
        classificationtype = 'tess-lightcurve'
      );
  END IF;
END $$;

COMMENT ON POLICY authenticated_insert_own_classifications ON classifications IS
  'Allows Supabase anonymous-auth sessions (authenticated role) to insert their own TESS lightcurve classifications.';

COMMENT ON POLICY authenticated_select_game_classifications ON classifications IS
  'Allows Supabase anonymous-auth sessions (authenticated role) to read TESS lightcurve classifications for consensus and verification.';
