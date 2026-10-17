import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentUser as mockUser, workspace as mockWorkspace } from "@/lib/mock/data";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser, Role, Workspace } from "@/lib/types";

export interface Ctx {
  /** True when Supabase env vars are missing: everything reads from mock data and writes are no-ops. */
  demo: boolean;
  supabase: SupabaseClient | null;
  user: CurrentUser;
  workspace: Workspace;
  role: Role;
}

interface MemberRow {
  role: Role;
  workspaces: { id: string; name: string; plan: string; timezone: string; monthly_spend_limit: number } | null;
}

/** Resolves the signed-in user and their workspace once per request. */
export const getContext = cache(async (): Promise<Ctx> => {
  if (!isSupabaseConfigured) {
    return {
      demo: true, supabase: null, role: "owner",
      user: { id: "u1", name: mockUser.name, email: mockUser.email, role: "owner" },
      workspace: { ...mockWorkspace, monthlySpendLimit: 50 },
    };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", auth.user.id).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, plan, timezone, monthly_spend_limit)")
      .eq("user_id", auth.user.id)
      .order("created_at")
      .limit(1)
      .returns<MemberRow[]>()
      .maybeSingle(),
  ]);

  const ws = membership?.workspaces;
  if (!membership || !ws) throw new Error("This account is not a member of any workspace.");

  return {
    demo: false, supabase, role: membership.role,
    user: {
      id: auth.user.id,
      name: profile?.full_name || auth.user.email?.split("@")[0] || "You",
      email: profile?.email || auth.user.email || "",
      role: membership.role,
    },
    workspace: { id: ws.id, name: ws.name, plan: ws.plan, timezone: ws.timezone, monthlySpendLimit: Number(ws.monthly_spend_limit) },
  };
});

/** Supabase client for a real (non-demo) context. */
export function db(ctx: Ctx): SupabaseClient {
  if (!ctx.supabase) throw new Error("Supabase is not configured");
  return ctx.supabase;
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function fail(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what}: ${error.message}`);
}
