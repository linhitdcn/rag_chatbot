import { bots as mockBots } from "@/lib/mock/data";
import type { Bot } from "@/lib/types";
import { resolveWidget } from "@/lib/validations/widget";
import { db, fail, getContext, isUuid } from "./context";

export interface BotRow {
  id: string;
  workspace_id: string;
  public_id: string;
  name: string;
  description: string;
  status: Bot["status"];
  avatar_color: string;
  provider: Bot["provider"];
  model: string;
  tone: Bot["tone"];
  system_prompt: string;
  welcome_message: string;
  fallback_message: string;
  starter_questions: string[];
  temperature: number;
  max_tokens: number;
  top_k: number;
  similarity_threshold: number;
  citations: boolean;
  feedback: boolean;
  lead_capture: boolean;
  lead_fields: Bot["features"]["leadFields"];
  lead_timing: Bot["features"]["leadTiming"];
  handoff_email: string;
  widget: unknown;
  bot_sources: { source_id: string }[];
}

const SELECT = "*, bot_sources(source_id)";

function toBot(r: BotRow, conversations30d: number): Bot {
  return {
    id: r.id, publicId: r.public_id, name: r.name, description: r.description, status: r.status,
    avatarColor: r.avatar_color, sourceCount: r.bot_sources.length, conversations30d,
    provider: r.provider, model: r.model, tone: r.tone, systemPrompt: r.system_prompt,
    welcomeMessage: r.welcome_message, fallbackMessage: r.fallback_message, starterQuestions: r.starter_questions,
    temperature: r.temperature, maxTokens: r.max_tokens, topK: r.top_k, similarityThreshold: r.similarity_threshold,
    sourceIds: r.bot_sources.map((s) => s.source_id),
    widget: resolveWidget(r.widget, { name: r.name, welcomeMessage: r.welcome_message }),
    features: {
      citations: r.citations, leadCapture: r.lead_capture, leadFields: r.lead_fields,
      leadTiming: r.lead_timing, handoffEmail: r.handoff_email, feedback: r.feedback,
    },
  };
}

export async function listBots(): Promise<Bot[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockBots;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [bots, convs] = await Promise.all([
    db(ctx).from("bots").select(SELECT).order("created_at", { ascending: false }).returns<BotRow[]>(),
    db(ctx).from("conversations").select("bot_id").gte("started_at", since).returns<{ bot_id: string }[]>(),
  ]);
  fail(bots.error, "Loading bots");
  fail(convs.error, "Loading conversation counts");
  const counts = new Map<string, number>();
  for (const c of convs.data ?? []) counts.set(c.bot_id, (counts.get(c.bot_id) ?? 0) + 1);
  return (bots.data ?? []).map((r) => toBot(r, counts.get(r.id) ?? 0));
}

export async function getBot(id: string): Promise<Bot | null> {
  const ctx = await getContext();
  if (ctx.demo) return mockBots.find((b) => b.id === id) ?? null;
  if (!isUuid(id)) return null;
  const { data, error } = await db(ctx).from("bots").select(SELECT).eq("id", id).returns<BotRow[]>().maybeSingle();
  fail(error, "Loading bot");
  return data ? toBot(data, 0) : null;
}
