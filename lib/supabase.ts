/**
 * Supabase client for the manager. Server only: the variables are not
 * NEXT_PUBLIC_, so every read and write goes through a Server Component or a
 * Server Function (app/actions.ts). Same variables as sdui-web: both projects
 * point to the same database.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY (ver .env.example).');

  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
