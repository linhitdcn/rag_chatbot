import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gives a signed-in user a workspace when they don't have one yet. The signup trigger normally does this; this
 * covers accounts created before the migrations ran (or before the trigger existed). Mirrors the trigger: accept
 * pending invitations first, otherwise create a personal workspace owned by the user.
 */
export async function provisionWorkspace(user: { id: string; email?: string | null; fullName?: string | null }) {
  const admin = createAdminClient();
  const email = user.email ?? "";
  const display = user.fullName?.trim() || email.split("@")[0] || "My";

  const { error: profileError } = await admin.from("profiles").upsert({ id: user.id, full_name: display, email }, { ignoreDuplicates: true });
  if (profileError) throw new Error(`Couldn't create your profile: ${profileError.message}`);

  // Re-check with the service role so two concurrent first requests don't create two workspaces.
  const { data: existing } = await admin.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1);
  if (existing?.length) return;

  const { data: invites } = await admin.from("invitations").select("id, workspace_id, role").ilike("email", email);
  if (email && invites?.length) {
    for (const inv of invites) {
      await admin.from("workspace_members").upsert({ workspace_id: inv.workspace_id, user_id: user.id, role: inv.role }, { ignoreDuplicates: true });
      await admin.from("invitations").delete().eq("id", inv.id);
    }
    return;
  }

  const { data: ws, error } = await admin.from("workspaces").insert({ name: `${display}'s workspace` }).select("id").single();
  if (error) throw new Error(`Couldn't create your workspace: ${error.message}`);
  const { error: memberError } = await admin.from("workspace_members").insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });
  if (memberError) throw new Error(`Couldn't add you to your workspace: ${memberError.message}`);
}
