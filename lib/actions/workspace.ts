"use server";

import { revalidatePath } from "next/cache";
import { db, isUuid } from "@/lib/data/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteSchema, workspaceSchema, type InviteValues, type WorkspaceValues } from "@/lib/validations/settings";
import type { Role, TeamMember, UnansweredQuestion } from "@/lib/types";
import { authorize, err, ok, type ActionResult } from "./shared";

export async function updateWorkspace(input: WorkspaceValues): Promise<ActionResult> {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid workspace settings");
  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const { error } = await db(auth.ctx).from("workspaces")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone }).eq("id", auth.ctx.workspace.id);
  if (error) return err(error.message);
  revalidatePath("/", "layout");
  return ok();
}

export async function setSpendLimit(usd: number): Promise<ActionResult> {
  if (!Number.isFinite(usd) || usd <= 0 || usd > 1_000_000) return err("Enter a spend limit greater than 0");
  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const { error } = await db(auth.ctx).from("workspaces").update({ monthly_spend_limit: usd }).eq("id", auth.ctx.workspace.id);
  if (error) return err(error.message);
  revalidatePath("/settings/usage");
  return ok();
}

export async function inviteMember(input: InviteValues): Promise<ActionResult<TeamMember>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid invitation");
  const email = parsed.data.email.trim().toLowerCase();
  const { role } = parsed.data;

  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  if (ctx.demo) return ok({ id: `u${Date.now()}`, name: "—", email, role, status: "invited" });

  // Already has an account: add them straight to the workspace.
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id, full_name").ilike("email", email).maybeSingle();
  if (existing) {
    const { error } = await admin.from("workspace_members")
      .upsert({ workspace_id: ctx.workspace.id, user_id: existing.id, role }, { ignoreDuplicates: true });
    if (error) return err(error.message);
    revalidatePath("/settings/team");
    return ok({ id: existing.id as string, name: (existing.full_name as string) || "—", email, role, status: "active" });
  }

  const { data, error } = await db(ctx).from("invitations")
    .upsert({ workspace_id: ctx.workspace.id, email, role }, { onConflict: "workspace_id,email" }).select("id").single();
  if (error) return err(error.message);

  // The signup trigger turns this invitation into a membership when the invitee creates their account.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=/dashboard` });
  revalidatePath("/settings/team");
  if (mailError) return err(`Invitation saved, but the email couldn't be sent: ${mailError.message}`);
  return ok({ id: `invite:${data.id}`, name: "—", email, role, status: "invited" });
}

export async function changeMemberRole(id: string, role: Exclude<Role, "owner">): Promise<ActionResult> {
  if (role !== "editor" && role !== "viewer") return err("Invalid role");
  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const supabase = db(auth.ctx);
  const query = id.startsWith("invite:")
    ? supabase.from("invitations").update({ role }).eq("id", id.slice(7))
    : isUuid(id) ? supabase.from("workspace_members").update({ role }).eq("user_id", id).eq("workspace_id", auth.ctx.workspace.id) : null;
  if (!query) return err("Member not found");
  const { error } = await query;
  if (error) return err(error.message);
  revalidatePath("/settings/team");
  return ok();
}

export async function removeMember(id: string): Promise<ActionResult> {
  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const supabase = db(auth.ctx);
  const query = id.startsWith("invite:")
    ? supabase.from("invitations").delete().eq("id", id.slice(7))
    : isUuid(id) ? supabase.from("workspace_members").delete().eq("user_id", id).eq("workspace_id", auth.ctx.workspace.id) : null;
  if (!query) return err("Member not found");
  const { error } = await query;
  if (error) return err(error.message);
  revalidatePath("/settings/team");
  return ok();
}

export async function setUnansweredStatus(id: string, status: Exclude<UnansweredQuestion["status"], "open">): Promise<ActionResult> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  if (!isUuid(id)) return err("Question not found");
  const { error } = await db(auth.ctx).from("unanswered_questions").update({ status }).eq("id", id);
  if (error) return err(error.message);
  revalidatePath("/unanswered");
  return ok();
}
