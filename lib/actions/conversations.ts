"use server";

import { revalidatePath } from "next/cache";
import { getContext, isUuid } from "@/lib/data/context";
import { MESSAGE_COLS, toMessage, type MessageRow } from "@/lib/data/conversations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversationMode, Message } from "@/lib/types";
import { authorize, err, ok, type ActionResult } from "./shared";

const MAX_REPLY = 2000;

/**
 * Agent actions write with the service-role client (RLS only lets members read these tables), so each one first
 * proves the conversation belongs to the caller's workspace.
 */
async function ownConversation(id: string, workspaceId: string) {
  if (!isUuid(id)) return null;
  const { data } = await createAdminClient().from("conversations").select("id, mode, workspace_id, bot_id")
    .eq("id", id).eq("workspace_id", workspaceId).maybeSingle<{ id: string; mode: ConversationMode; workspace_id: string; bot_id: string }>();
  return data;
}

export async function setConversationMode(id: string, mode: "human" | "bot"): Promise<ActionResult<{ mode: ConversationMode }>> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok({ mode });
  const conv = await ownConversation(id, auth.ctx.workspace.id);
  if (!conv) return err("Conversation not found");
  const { error } = await createAdminClient().from("conversations").update({ mode }).eq("id", id);
  if (error) return err(error.message);
  revalidatePath("/conversations");
  return ok({ mode });
}

/** Sends a message as a person. Replying also takes the conversation over so the bot doesn't talk over the agent. */
export async function sendAgentReply(id: string, content: string): Promise<ActionResult<{ message: Message; mode: ConversationMode }>> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  const text = content.trim().slice(0, MAX_REPLY);
  if (!text) return err("Write a message first");
  const { ctx } = auth;
  if (ctx.demo) {
    return ok({ mode: "human", message: { id: `m_${Date.now()}`, role: "agent", agentName: ctx.user.name, content: text, createdAt: new Date().toISOString() } });
  }
  const conv = await ownConversation(id, ctx.workspace.id);
  if (!conv) return err("Conversation not found");

  const admin = createAdminClient();
  const { data, error } = await admin.from("messages").insert({
    conversation_id: id, workspace_id: conv.workspace_id, bot_id: conv.bot_id, role: "agent", content: text, agent_name: ctx.user.name, unanswered: false,
  }).select(MESSAGE_COLS).returns<MessageRow[]>().single();
  if (error) return err(error.message);

  const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", id);
  await admin.from("conversations").update({ mode: "human", message_count: count ?? 0 }).eq("id", id);
  revalidatePath("/conversations");
  return ok({ mode: "human", message: toMessage(data as unknown as MessageRow) });
}

/** Polled by the agent's open conversation page to pick up new visitor messages and mode changes. */
export async function pollConversation(id: string): Promise<ActionResult<{ mode: ConversationMode; messages: Message[] }>> {
  const ctx = await getContext();
  if (ctx.demo) return ok({ mode: "bot", messages: [] });
  if (!isUuid(id)) return err("Conversation not found");
  const supabase = ctx.supabase!;
  const [conv, msgs] = await Promise.all([
    supabase.from("conversations").select("mode").eq("id", id).maybeSingle<{ mode: ConversationMode }>(),
    supabase.from("messages").select(MESSAGE_COLS).eq("conversation_id", id).order("created_at").returns<MessageRow[]>(),
  ]);
  if (conv.error || msgs.error || !conv.data) return err("Couldn't refresh the conversation");
  return ok({ mode: conv.data.mode, messages: (msgs.data ?? []).map(toMessage) });
}

/** Deletes conversations and (by cascade) their messages. Captured leads stay, just unlinked from the chat. */
export async function deleteConversations(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok({ deleted: ids.length });
  const valid = [...new Set(ids.filter(isUuid))];
  if (!valid.length) return err("Nothing to delete");
  if (valid.length > 500) return err("Select at most 500 conversations at a time.");
  // RLS (conversations_delete) limits this to the caller's workspace; select the ids back to report an honest count.
  const { data, error } = await auth.ctx.supabase!.from("conversations").delete().in("id", valid).select("id");
  if (error) return err(error.message);
  revalidatePath("/conversations");
  revalidatePath("/dashboard");
  return ok({ deleted: data?.length ?? 0 });
}
