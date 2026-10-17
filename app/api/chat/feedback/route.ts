import { isUuid } from "@/lib/data/context";
import { rateLimit } from "@/lib/chat/rate-limit";
import { findOwnedConversation } from "@/lib/chat/visitor";
import { createAdminClient } from "@/lib/supabase/admin";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Thumbs up/down on an assistant answer from the widget. */
export async function POST(request: Request) {
  let body: { botPublicId?: unknown; visitorId?: unknown; conversationId?: unknown; messageId?: unknown; rating?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { messageId, rating } = body;
  if (typeof messageId !== "string" || !isUuid(messageId)) return json({ error: "Invalid message" }, 400);
  if (rating !== "up" && rating !== "down" && rating !== null) return json({ error: "Invalid rating" }, 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(`feedback:${ip}`, 60, 60_000)) return json({ error: "Too many requests" }, 429);

  const conversation = await findOwnedConversation(body.botPublicId, body.visitorId, body.conversationId);
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const admin = createAdminClient();
  const { data, error } = await admin.from("messages").update({ feedback: rating })
    .eq("id", messageId).eq("conversation_id", conversation.id).eq("role", "assistant").select("id").maybeSingle();
  if (error) return json({ error: "Couldn't save feedback" }, 500);
  if (!data) return json({ error: "Message not found" }, 404);
  await admin.from("conversations").update({ rating }).eq("id", conversation.id);
  return json({ ok: true });
}
