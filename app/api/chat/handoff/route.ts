import { rateLimit } from "@/lib/chat/rate-limit";
import { findOwnedConversation } from "@/lib/chat/visitor";
import { createAdminClient } from "@/lib/supabase/admin";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** The visitor asks to talk to a person. The conversation moves to "waiting" until an agent replies. */
export async function POST(request: Request) {
  let body: { botPublicId?: unknown; visitorId?: unknown; conversationId?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(`handoff:${ip}`, 10, 60_000)) return json({ error: "Too many requests" }, 429);

  const conversation = await findOwnedConversation(body.botPublicId, body.visitorId, body.conversationId);
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const { data: bot } = await createAdminClient().from("bots").select("live_chat").eq("id", conversation.bot_id).maybeSingle();
  if (!bot?.live_chat) return json({ error: "Live chat is turned off for this bot." }, 403);

  if (conversation.mode === "bot") {
    const { error } = await createAdminClient().from("conversations")
      .update({ mode: "waiting", handoff_requested_at: new Date().toISOString() }).eq("id", conversation.id);
    if (error) return json({ error: "Couldn't reach the team. Please try again." }, 500);
    return json({ mode: "waiting" });
  }
  return json({ mode: conversation.mode });
}
