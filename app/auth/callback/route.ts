import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Completes email-confirmation, invite and OAuth sign-ins by exchanging the `code` for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Only follow same-site relative paths, never an attacker-supplied absolute URL.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
