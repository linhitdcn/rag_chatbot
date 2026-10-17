"use server";

import { revalidatePath } from "next/cache";
import { db, isUuid } from "@/lib/data/context";
import { botSchema, type BotFormValues } from "@/lib/validations/bot";
import { widgetSchema, type WidgetSettings } from "@/lib/validations/widget";
import { authorize, err, message, ok, type ActionResult } from "./shared";

export async function saveBot(id: string | null, input: BotFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = botSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid bot settings");
  const v = parsed.data;

  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  if (ctx.demo) return ok({ id: id ?? "bot_demo" });
  if (id && !isUuid(id)) return err("Bot not found");

  const row = {
    name: v.name, description: v.description, status: v.status, system_prompt: v.systemPrompt, tone: v.tone,
    welcome_message: v.welcomeMessage, fallback_message: v.fallbackMessage,
    starter_questions: v.starterQuestions.map((q) => q.value.trim()).filter(Boolean),
    provider: v.provider, model: v.model, temperature: v.temperature, max_tokens: v.maxTokens, top_k: v.topK,
    similarity_threshold: v.similarityThreshold, citations: v.citations, feedback: v.feedback,
    lead_capture: v.leadCapture, lead_fields: v.leadFields, lead_timing: v.leadTiming, handoff_email: v.handoffEmail,
  };

  try {
    const supabase = db(ctx);
    let botId = id;
    if (botId) {
      const { data, error } = await supabase.from("bots").update(row).eq("id", botId).select("id").maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Bot not found");
    } else {
      const { data, error } = await supabase.from("bots").insert({ ...row, workspace_id: ctx.workspace.id }).select("id").single();
      if (error) return err(error.message);
      botId = data.id as string;
    }

    // Sync linked sources by diff so unchanged links aren't rewritten.
    const { data: existing, error: linkErr } = await supabase.from("bot_sources").select("source_id").eq("bot_id", botId);
    if (linkErr) return err(linkErr.message);
    const have = new Set((existing ?? []).map((r) => r.source_id as string));
    const want = new Set(v.sourceIds.filter(isUuid));
    const removed = [...have].filter((s) => !want.has(s));
    const added = [...want].filter((s) => !have.has(s));
    if (removed.length) {
      const { error } = await supabase.from("bot_sources").delete().eq("bot_id", botId).in("source_id", removed);
      if (error) return err(error.message);
    }
    if (added.length) {
      const { error } = await supabase.from("bot_sources").insert(added.map((source_id) => ({ bot_id: botId, source_id })));
      if (error) return err(error.message);
    }

    revalidatePath("/", "layout");
    return ok({ id: botId });
  } catch (e) {
    return err(message(e));
  }
}

export async function deleteBot(id: string): Promise<ActionResult> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  if (!isUuid(id)) return err("Bot not found");
  const { error } = await db(auth.ctx).from("bots").delete().eq("id", id);
  if (error) return err(error.message);
  revalidatePath("/", "layout");
  return ok();
}

export async function saveWidgetSettings(botId: string, input: WidgetSettings): Promise<ActionResult> {
  const parsed = widgetSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid widget settings");
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  if (!isUuid(botId)) return err("Bot not found");
  const domains = [...new Set(parsed.data.domains.map((d) => d.toLowerCase()))];
  const { data, error } = await db(auth.ctx).from("bots").update({ widget: { ...parsed.data, domains } }).eq("id", botId).select("id").maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Bot not found");
  revalidatePath("/widget");
  return ok();
}
