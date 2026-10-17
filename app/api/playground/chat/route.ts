import { getContext, db, isUuid } from "@/lib/data/context";
import type { BotRow } from "@/lib/data/bots";
import { ndjsonResponse, runChat, sanitizeHistory, type EngineBot } from "@/lib/chat/engine";
import { rateLimit } from "@/lib/chat/rate-limit";

export const maxDuration = 60;

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Authenticated test chat for the dashboard Playground. Nothing is stored as a conversation. */
export async function POST(request: Request) {
  const ctx = await getContext(); // redirects signed-out users in real mode
  if (ctx.demo) return json({ error: "The playground needs Supabase to be configured." }, 503);

  let body: { botId?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const history = sanitizeHistory(body.messages);
  if (typeof body.botId !== "string" || !isUuid(body.botId)) return json({ error: "Unknown bot" }, 404);
  if (!history) return json({ error: "Send at least one user message" }, 400);
  if (!rateLimit(`playground:${ctx.user.id}`, 30, 60_000)) return json({ error: "Too many messages. Please slow down." }, 429);

  // Fetched with the user's session, so RLS guarantees the bot belongs to their workspace.
  const { data: bot } = await db(ctx).from("bots").select("*").eq("id", body.botId).maybeSingle<BotRow>();
  if (!bot) return json({ error: "Unknown bot" }, 404);

  return ndjsonResponse(runChat({ bot: bot as unknown as EngineBot, history, persist: null, signal: request.signal }));
}
