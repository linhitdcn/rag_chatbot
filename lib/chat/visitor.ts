import { isUuid } from "@/lib/data/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const BOT_ID_RE = /^bt_[A-Za-z0-9]{4,20}$/;
export const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** The value stored in conversations.visitor for an anonymous widget visitor. */
export const visitorKey = (visitorId: string) => `visitor-${visitorId.slice(0, 12)}`;

export interface OwnedConversation {
  id: string;
  workspace_id: string;
  bot_id: string;
}

/**
 * Looks up a conversation only if it belongs to this bot AND this visitor. Public endpoints take the ids from
 * the client, so this is the authorization check for anything that touches an existing conversation.
 */
export async function findOwnedConversation(botPublicId: unknown, visitorId: unknown, conversationId: unknown): Promise<OwnedConversation | null> {
  if (typeof botPublicId !== "string" || !BOT_ID_RE.test(botPublicId)) return null;
  if (typeof visitorId !== "string" || !VISITOR_ID_RE.test(visitorId)) return null;
  if (typeof conversationId !== "string" || !isUuid(conversationId)) return null;
  const admin = createAdminClient();
  const { data: bot } = await admin.from("bots").select("id").eq("public_id", botPublicId).maybeSingle();
  if (!bot) return null;
  const { data } = await admin.from("conversations").select("id, workspace_id, bot_id")
    .eq("id", conversationId).eq("bot_id", bot.id).eq("visitor", visitorKey(visitorId)).maybeSingle<OwnedConversation>();
  return data ?? null;
}
