import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use runtime NODE_ENV to decide which keys to use.
const isProduction = process.env.NODE_ENV === 'production';

// Production (build) values: prefer env vars named NEXT_PUBLIC_..., fallback to provided prod defaults.
const PROD_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hlufptwhzkpkkjztimzo.supabase.co';
const PROD_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I';

// Development (local) values: prefer EXPO_PUBLIC_* then NEXT_PUBLIC_* to allow different dev setups
const DEV_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const DEV_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const supabaseUrl = isProduction ? PROD_SUPABASE_URL : DEV_SUPABASE_URL;
const supabaseAnonKey = isProduction ? PROD_SUPABASE_ANON_KEY : DEV_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    `Supabase variables not fully set (isProduction=${isProduction}). Expected URL and ANON key.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
