/* Supabase configuration. When the env vars are absent the app runs in
   local-first dev mode (in-memory data, auth bypassed), so you can build and
   work on the portal before a Supabase project is connected. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
