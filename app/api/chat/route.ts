import { isUuid } from "@/lib/data/context";
import type { BotRow } from "@/lib/data/bots";
import { ndjsonResponse, runChat, sanitizeHistory, type EngineBot } from "@/lib/chat/engine";
import { rateLimit } from "@/lib/chat/rate-limit";
import { BOT_ID_RE, VISITOR_ID_RE, visitorKey } from "@/lib/chat/visitor";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Public chat endpoint used by the embedded widget. Visitors have no session. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return json({ error: "Chat needs Supabase to be configured." }, 503);

  let body: { botPublicId?: unknown; messages?: unknown; conversationId?: unknown; visitorId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { botPublicId, visitorId, conversationId } = body;
  const history = sanitizeHistory(body.messages);
  if (typeof botPublicId !== "string" || !BOT_ID_RE.test(botPublicId)) return json({ error: "Unknown bot" }, 404);
  if (typeof visitorId !== "string" || !VISITOR_ID_RE.test(visitorId)) return json({ error: "Invalid visitor" }, 400);
  if (!history) return json({ error: "Send at least one user message" }, 400);
  if (conversationId != null && (typeof conversationId !== "string" || !isUuid(conversationId))) return json({ error: "Invalid conversation" }, 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(`chat:${ip}:${botPublicId}`, 20, 60_000)) return json({ error: "Too many messages. Please slow down." }, 429);

  const { data: bot } = await createAdminClient()
    .from("bots").select("*").eq("public_id", botPublicId).eq("status", "active").maybeSingle<BotRow>();
  if (!bot) return json({ error: "Unknown bot" }, 404);

  return ndjsonResponse(runChat({
    bot: bot as unknown as EngineBot,
    history,
    persist: { conversationId: (conversationId as string | null | undefined) ?? null, visitor: visitorKey(visitorId) },
    signal: request.signal,
  }));
}
