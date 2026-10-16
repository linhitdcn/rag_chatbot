import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY: bypasses RLS. Import exclusively from
 * route handlers / server actions (public chat, ingestion), never from client code.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
