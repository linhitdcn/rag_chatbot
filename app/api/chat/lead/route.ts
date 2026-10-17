import { rateLimit } from "@/lib/chat/rate-limit";
import { findOwnedConversation } from "@/lib/chat/visitor";
import { createAdminClient } from "@/lib/supabase/admin";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Lead capture submitted from the widget. One lead per conversation (later submissions replace the earlier one). */
export async function POST(request: Request) {
  let body: { botPublicId?: unknown; visitorId?: unknown; conversationId?: unknown; name?: unknown; email?: unknown; phone?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(`lead:${ip}`, 10, 60_000)) return json({ error: "Too many requests" }, 429);

  const conversation = await findOwnedConversation(body.botPublicId, body.visitorId, body.conversationId);
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const name = text(body.name, 100);
  const email = text(body.email, 200);
  const phone = text(body.phone, 40);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address" }, 400);
  if (!name && !email && !phone) return json({ error: "Enter your contact details" }, 400);

  const admin = createAdminClient();
  const { data: bot } = await admin.from("bots").select("lead_capture").eq("id", conversation.bot_id).maybeSingle();
  if (!bot?.lead_capture) return json({ error: "Lead capture is disabled" }, 400);

  await admin.from("leads").delete().eq("conversation_id", conversation.id);
  const { error } = await admin.from("leads").insert({
    workspace_id: conversation.workspace_id, bot_id: conversation.bot_id, conversation_id: conversation.id, name, email, phone,
  });
  if (error) return json({ error: "Couldn't save your details" }, 500);
  return json({ ok: true });
}
