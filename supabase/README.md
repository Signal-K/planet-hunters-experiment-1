# Supabase Migrations

## How to Apply

Run each migration file in order via the **Supabase SQL Editor**:
https://supabase.com/dashboard/project/hlufptwhzkpkkjztimzo/sql/new

Or via psql using your DB connection string from the Supabase dashboard.

## Migrations

### 20260309_tess_disposition_fields.sql
Adds `tess_disposition`, `tess_sector`, `tess_year` columns to the `anomalies` table.
- Enables science blurbs on target cards (PC / KP / CP distinction)
- Backfills all existing `telescope-tess` anomalies with disposition `'PC'`
- Safe to re-run (uses `ADD COLUMN IF NOT EXISTS`)

### 20260309_classifications_game_index.sql
Adds performance indexes and RLS policy for game-driven TESS lightcurve classifications.
- `classificationtype = 'tess-lightcurve'` is the game's write path
- Ensures anon key can INSERT (conditional on RLS being enabled)
- Safe to re-run (uses `CREATE INDEX IF NOT EXISTS`)

### 20260413_classifications_authenticated_guest_policy.sql
Adds the missing `authenticated` RLS policies for the game's anonymous-auth guest flow.
- Anonymous Supabase sign-in yields the `authenticated` role, not `anon`
- Allows inserts where `author = auth.uid()` for `tess-lightcurve`
- Allows authenticated clients to read `tess-lightcurve` rows for consensus/read-back

## Classification Shape (game writes)

```json
{
  "classificationtype": "tess-lightcurve",
  "anomaly": 329981856,
  "author": "<player-uuid>",
  "content": "Planet candidate — 2 annotations",
  "classificationConfiguration": {
    "verdict": "planet",
    "annotation_count": 2,
    "annotations": [],
    "source": "star-sailors-game",
    "game_session": "<uuid>"
  }
}
```
