import { rateLimit } from "@/lib/chat/rate-limit";
import { findOwnedConversation } from "@/lib/chat/visitor";
import { createAdminClient } from "@/lib/supabase/admin";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Visitors poll this for the conversation mode and any new agent messages. Polling (instead of Realtime) keeps
 * anonymous visitors off the database: they only ever see rows the server hands them for their own conversation.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(`poll:${ip}`, 40, 60_000)) return json({ error: "Too many requests" }, 429);

  const conversation = await findOwnedConversation(url.searchParams.get("botPublicId"), url.searchParams.get("visitorId"), url.searchParams.get("conversationId"));
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const afterParam = url.searchParams.get("after");
  const after = afterParam && !Number.isNaN(Date.parse(afterParam)) ? new Date(afterParam).toISOString() : null;

  let query = createAdminClient().from("messages").select("id, content, agent_name, created_at")
    .eq("conversation_id", conversation.id).eq("role", "agent").order("created_at").limit(50);
  if (after) query = query.gt("created_at", after);
  const { data, error } = await query;
  if (error) return json({ error: "Couldn't load messages" }, 500);

  return json({
    mode: conversation.mode,
    messages: (data ?? []).map((m) => ({ id: m.id, content: m.content, agentName: m.agent_name ?? "Support team", createdAt: m.created_at })),
  });
}
