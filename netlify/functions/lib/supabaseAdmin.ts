import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE ROLE key. This bypasses
 * Row Level Security and must NEVER be exposed to the frontend/browser.
 * It only ever runs inside Netlify Functions.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas nas variáveis de ambiente do Netlify.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
