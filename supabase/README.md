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
