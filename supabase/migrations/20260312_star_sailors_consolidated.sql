-- Landnám: Consolidated Game Schema (Fixed Quoting & Names)
-- Covers: Citizen Science (TESS), Economy, Fleet, Mining, and Customization.

-- 1. BASE TABLES
-- Using BIGINT for anomalies to match TESS/TIC ID standards (e.g., 101445733)
-- We use double-quotes for "anomalySet" to avoid PostgreSQL case-insensitivity issues
CREATE TABLE IF NOT EXISTS anomalies (
    id BIGINT PRIMARY KEY,
    label TEXT,
    "anomalySet" TEXT, 
    type TEXT DEFAULT 'asteroid',
    data_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Handle existing classifications table or create new
CREATE TABLE IF NOT EXISTS classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    anomaly BIGINT REFERENCES anomalies(id), 
    classificationtype TEXT DEFAULT 'tess-lightcurve',
    verdict TEXT,
    annotation_configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure classifications has 'anomaly' column if it was created differently
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classifications' AND column_name='anomaly') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classifications' AND column_name='anomaly_id') THEN
            ALTER TABLE classifications RENAME COLUMN anomaly_id TO anomaly;
        ELSE
            ALTER TABLE classifications ADD COLUMN anomaly BIGINT REFERENCES anomalies(id);
        END IF;
    END IF;
END $$;

-- 2. TESS CITIZEN SCIENCE FIELDS
ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS tess_disposition TEXT DEFAULT NULL;
ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS tess_sector INTEGER DEFAULT NULL;
ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS tess_year INTEGER DEFAULT NULL;

-- 3. PLAYER PROFILES
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE,
    franc_balance BIGINT DEFAULT 1000,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    affinity_json JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FLEET & SHIPS
CREATE TABLE IF NOT EXISTS player_rockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    rocket_template_id TEXT,
    rocket_name TEXT,
    status TEXT DEFAULT 'idle',
    current_location_id BIGINT REFERENCES anomalies(id),
    
    rooms_json JSONB DEFAULT '[]', 
    customization_json JSONB DEFAULT '{}',
    wear_percent FLOAT DEFAULT 0.0,
    
    cargo_json JSONB DEFAULT '{}',
    last_action_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MISSION LOGS
CREATE TABLE IF NOT EXISTS mission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    rocket_id UUID REFERENCES player_rockets(id) ON DELETE SET NULL,
    target_id BIGINT REFERENCES anomalies(id),
    action TEXT,
    payout_francs BIGINT DEFAULT 0,
    cargo_secured_json JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_anomalies_tess_disposition ON anomalies (tess_disposition) WHERE tess_disposition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classifications_anomaly ON classifications (anomaly);
CREATE INDEX IF NOT EXISTS idx_rockets_owner ON player_rockets (owner_id);
CREATE INDEX IF NOT EXISTS idx_logs_player ON mission_logs (player_id);

-- 7. RLS POLICIES
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_classifications') THEN
        CREATE POLICY anon_insert_classifications ON classifications FOR INSERT TO anon WITH CHECK (true);
    END IF;
END $$;

DROP POLICY IF EXISTS "Users can view own profile" ON player_profiles;
CREATE POLICY "Users can view own profile" ON player_profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON player_profiles;
CREATE POLICY "Users can update own profile" ON player_profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can manage own rockets" ON player_rockets;
CREATE POLICY "Users can manage own rockets" ON player_rockets FOR ALL USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can view own logs" ON mission_logs;
CREATE POLICY "Users can view own logs" ON mission_logs FOR SELECT USING (auth.uid() = player_id);

-- 8. BACKFILL
-- Double-quoting "anomalySet" to satisfy PostgreSQL camelCase requirements
UPDATE anomalies SET tess_disposition = 'PC' WHERE "anomalySet" = 'telescope-tess' AND tess_disposition IS NULL;
