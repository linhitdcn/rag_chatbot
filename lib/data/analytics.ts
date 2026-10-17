import { conversations as mockConversations, leads as mockLeads } from "@/lib/mock/data";
import type { Conversation } from "@/lib/types";
import { db, fail, getContext } from "./context";
import { listConversations } from "./conversations";

/** Demo mode pins "now" so mock data stays deterministic. */
const DEMO_NOW = "2026-10-16T09:30:00Z";
export const DASHBOARD_DAYS = 90;

/** Reference "now" for relative date filters: pinned in demo mode so the mock data stays in range. */
export async function getNow(): Promise<string> {
  const ctx = await getContext();
  return ctx.demo ? DEMO_NOW : new Date().toISOString();
}

export interface TokenRow {
  at: string;
  botId: string;
  tokens: number;
}
export interface DashboardInput {
  now: string;
  conversations: Conversation[];
  leads: { botId: string; capturedAt: string }[];
  tokens: TokenRow[];
}

/** Raw rows for the dashboard; the client aggregates them for the selected bot and date range. */
export async function getDashboardInput(): Promise<DashboardInput> {
  const ctx = await getContext();
  if (ctx.demo) {
    return {
      now: DEMO_NOW,
      conversations: mockConversations,
      leads: mockLeads.map((l) => ({ botId: l.botId, capturedAt: l.capturedAt })),
      tokens: mockConversations.map((c) => ({ at: c.startedAt, botId: c.botId, tokens: c.messageCount * 180 })),
    };
  }
  const since = new Date(Date.now() - DASHBOARD_DAYS * 86_400_000).toISOString();
  const supabase = db(ctx);
  const [conversations, leads, messages] = await Promise.all([
    listConversations({ days: DASHBOARD_DAYS, limit: 5000 }),
    supabase.from("leads").select("bot_id, captured_at").gte("captured_at", since).limit(5000)
      .returns<{ bot_id: string; captured_at: string }[]>(),
    supabase.from("messages").select("bot_id, created_at, tokens").eq("role", "assistant").gte("created_at", since).limit(20000)
      .returns<{ bot_id: string; created_at: string; tokens: number | null }[]>(),
  ]);
  fail(leads.error, "Loading leads");
  fail(messages.error, "Loading usage");
  return {
    now: new Date().toISOString(),
    conversations,
    leads: (leads.data ?? []).map((l) => ({ botId: l.bot_id, capturedAt: l.captured_at })),
    tokens: (messages.data ?? []).map((m) => ({ at: m.created_at, botId: m.bot_id, tokens: m.tokens ?? 0 })),
  };
}

export async function getUsage(): Promise<{ byDay: { label: string; tokens: number }[]; monthTokens: number }> {
  const { now, tokens } = await getDashboardInput();
  const end = new Date(now);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const byDate = new Map<string, number>();
  for (const t of tokens) byDate.set(t.at.slice(0, 10), (byDate.get(t.at.slice(0, 10)) ?? 0) + t.tokens);

  const byDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(end.getTime() - (29 - i) * 86_400_000);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      tokens: byDate.get(day(d)) ?? 0,
    };
  });
  const monthPrefix = day(end).slice(0, 7);
  const monthTokens = tokens.filter((t) => t.at.startsWith(monthPrefix)).reduce((s, t) => s + t.tokens, 0);
  return { byDay, monthTokens };
}
