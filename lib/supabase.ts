// Thin wrapper around Supabase's REST (PostgREST) endpoint — the same
// approach the existing CRM uses, so behaviour stays identical. No SDK needed.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://etduovglrefjxotzypua.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_iHTTar0UlHZEVpNU0s6ukA_iYMhSzD0";

export const REST_BASE = `${SUPABASE_URL}/rest/v1`;

export function supabaseHeaders(extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}
