import { conversations as mockConversations, leads as mockLeads, transcriptFor } from "@/lib/mock/data";
import type { Citation, Conversation, ConversationMode, Lead, Message, Rating } from "@/lib/types";
import { db, fail, getContext, isUuid } from "./context";

interface ConversationRow {
  id: string;
  bot_id: string;
  visitor: string;
  preview: string;
  message_count: number;
  rating: Rating;
  unanswered: boolean;
  started_at: string;
  mode: ConversationMode;
}
interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  bot_id: string;
  conversation_id: string | null;
  captured_at: string;
}
interface MessageRow {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  citations: Citation[] | null;
  tokens: number | null;
  latency_ms: number | null;
  model: string | null;
  unanswered: boolean;
  feedback: Rating;
  agent_name: string | null;
  created_at: string;
}

const CONV_COLS = "id, bot_id, visitor, preview, message_count, rating, unanswered, started_at, mode";
const LEAD_COLS = "id, name, email, phone, bot_id, conversation_id, captured_at";

const toLead = (r: LeadRow): Lead => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, botId: r.bot_id,
  conversationId: r.conversation_id ?? "", capturedAt: r.captured_at,
});

function toConversation(r: ConversationRow, withLead: Set<string>): Conversation {
  return {
    id: r.id, botId: r.bot_id, visitor: r.visitor, preview: r.preview, messageCount: r.message_count,
    rating: r.rating, unanswered: r.unanswered, startedAt: r.started_at, hasLead: withLead.has(r.id), mode: r.mode,
  };
}

export function toMessage(m: MessageRow): Message {
  return {
    id: m.id, role: m.role, content: m.content, createdAt: m.created_at, agentName: m.agent_name ?? undefined,
    citations: m.citations ?? undefined, tokens: m.tokens ?? undefined, latencyMs: m.latency_ms ?? undefined,
    model: m.model ?? undefined, unanswered: m.unanswered || undefined, feedback: m.feedback,
  };
}

export const MESSAGE_COLS = "id, role, content, citations, tokens, latency_ms, model, unanswered, feedback, agent_name, created_at";
export type { MessageRow };

/** Newest first. `days` bounds the window; `limit` caps the rows the table has to hold. */
export async function listConversations({ days = 90, limit = 500 }: { days?: number; limit?: number } = {}): Promise<Conversation[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockConversations;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [convs, leads] = await Promise.all([
    db(ctx).from("conversations").select(CONV_COLS).gte("started_at", since)
      .order("started_at", { ascending: false }).limit(limit).returns<ConversationRow[]>(),
    db(ctx).from("leads").select("conversation_id").gte("captured_at", since).returns<{ conversation_id: string | null }[]>(),
  ]);
  fail(convs.error, "Loading conversations");
  fail(leads.error, "Loading leads");
  const withLead = new Set((leads.data ?? []).flatMap((l) => (l.conversation_id ? [l.conversation_id] : [])));
  return (convs.data ?? []).map((r) => toConversation(r, withLead));
}

export async function getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[]; lead: Lead | null } | null> {
  const ctx = await getContext();
  if (ctx.demo) {
    const conversation = mockConversations.find((c) => c.id === id);
    if (!conversation) return null;
    return { conversation, messages: transcriptFor(id), lead: mockLeads.find((l) => l.conversationId === id) ?? null };
  }
  if (!isUuid(id)) return null;
  const supabase = db(ctx);
  const [conv, msgs, lead] = await Promise.all([
    supabase.from("conversations").select(CONV_COLS).eq("id", id).returns<ConversationRow[]>().maybeSingle(),
    supabase.from("messages")
      .select("id, role, content, citations, tokens, latency_ms, model, unanswered, feedback, agent_name, created_at")
      .eq("conversation_id", id).order("created_at").returns<MessageRow[]>(),
    supabase.from("leads").select(LEAD_COLS).eq("conversation_id", id).limit(1).returns<LeadRow[]>().maybeSingle(),
  ]);
  fail(conv.error, "Loading conversation");
  fail(msgs.error, "Loading messages");
  fail(lead.error, "Loading lead");
  if (!conv.data) return null;
  return {
    conversation: toConversation(conv.data, new Set(lead.data ? [id] : [])),
    messages: (msgs.data ?? []).map(toMessage),
    lead: lead.data ? toLead(lead.data) : null,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockLeads;
  const { data, error } = await db(ctx)
    .from("leads").select(LEAD_COLS).order("captured_at", { ascending: false }).limit(1000).returns<LeadRow[]>();
  fail(error, "Loading leads");
  return (data ?? []).map(toLead);
}
