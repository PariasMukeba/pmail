import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

/**
 * Returns the singleton Supabase service-role client.
 * Lazily initialized on first call so the build never throws when env vars
 * are absent from the Vercel build environment.
 */
function getInstance(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables",
      );
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

/**
 * Server-side Supabase client (service role, bypasses RLS).
 * All property accesses are proxied to the lazy singleton so existing
 * imports of `supabase` work unchanged.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const instance = getInstance();
    const value = Reflect.get(instance, prop, instance) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
}) as SupabaseClient;
