/** True when Supabase env vars are present. Without them the app runs in demo mode on mock data. */
export const isSupabaseConfiguredClient = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
