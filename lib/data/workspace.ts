import { team as mockTeam, unanswered as mockUnanswered } from "@/lib/mock/data";
import type { Role, TeamMember, UnansweredQuestion } from "@/lib/types";
import { db, fail, getContext } from "./context";

interface UnansweredRow {
  id: string;
  question: string;
  variants: string[];
  bot_id: string;
  count: number;
  last_seen_at: string;
  status: UnansweredQuestion["status"];
}

export async function listUnanswered(): Promise<UnansweredQuestion[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockUnanswered;
  const { data, error } = await db(ctx)
    .from("unanswered_questions").select("id, question, variants, bot_id, count, last_seen_at, status")
    .eq("status", "open").order("count", { ascending: false }).limit(200).returns<UnansweredRow[]>();
  fail(error, "Loading unanswered questions");
  return (data ?? []).map((r) => ({
    id: r.id, question: r.question, variants: r.variants, botId: r.bot_id, count: r.count,
    lastSeenAt: r.last_seen_at, status: r.status,
  }));
}

interface MemberRow {
  user_id: string;
  role: Role;
  profiles: { full_name: string; email: string } | null;
}
interface InviteRow {
  id: string;
  email: string;
  role: Role;
}

export async function listTeam(): Promise<TeamMember[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockTeam;
  const supabase = db(ctx);
  const [members, invites] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role, profiles(full_name, email)").order("created_at").returns<MemberRow[]>(),
    supabase.from("invitations").select("id, email, role").order("created_at").returns<InviteRow[]>(),
  ]);
  fail(members.error, "Loading team");
  fail(invites.error, "Loading invitations");
  return [
    ...(members.data ?? []).map((m): TeamMember => ({
      id: m.user_id, name: m.profiles?.full_name || "—", email: m.profiles?.email ?? "", role: m.role, status: "active",
    })),
    ...(invites.data ?? []).map((i): TeamMember => ({ id: `invite:${i.id}`, name: "—", email: i.email, role: i.role, status: "invited" })),
  ];
}
