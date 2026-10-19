import { bots as mockBots } from "@/lib/mock/data";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWidget, type WidgetSettings } from "@/lib/validations/widget";
import type { Bot } from "@/lib/types";

/** Only fields that are safe to show to anonymous visitors (never the system prompt, keys or owner info). */
export interface PublicBot {
  publicId: string;
  name: string;
  avatarColor: string;
  welcomeMessage: string;
  starterQuestions: string[];
  citations: boolean;
  feedback: boolean;
  leadCapture: boolean;
  leadFields: Bot["features"]["leadFields"];
  leadTiming: Bot["features"]["leadTiming"];
  liveChat: boolean;
  liveChatLabel: string;
  liveChatWaitingMessage: string;
  liveChatOffer: Bot["features"]["liveChatOffer"];
  widget: WidgetSettings;
}

interface Row {
  public_id: string;
  name: string;
  avatar_color: string;
  welcome_message: string;
  starter_questions: string[];
  citations: boolean;
  feedback: boolean;
  lead_capture: boolean;
  lead_fields: Bot["features"]["leadFields"];
  lead_timing: Bot["features"]["leadTiming"];
  live_chat: boolean;
  live_chat_label: string;
  live_chat_waiting_message: string;
  live_chat_offer: Bot["features"]["liveChatOffer"];
  widget: unknown;
}

/**
 * Public (signed-out) bot lookup for the embed page and widget config. Uses the service-role client because
 * visitors have no session; paused bots are treated as missing.
 */
export async function getPublicBot(publicId: string): Promise<PublicBot | null> {
  if (!isSupabaseConfigured) {
    const b = mockBots.find((x) => x.publicId === publicId && x.status === "active");
    return b ? {
      publicId: b.publicId, name: b.name, avatarColor: b.avatarColor, welcomeMessage: b.welcomeMessage, starterQuestions: b.starterQuestions,
      citations: b.features.citations, feedback: b.features.feedback, leadCapture: b.features.leadCapture, leadFields: b.features.leadFields,
      leadTiming: b.features.leadTiming, widget: b.widget,
      liveChat: b.features.liveChat, liveChatLabel: b.features.liveChatLabel, liveChatWaitingMessage: b.features.liveChatWaitingMessage, liveChatOffer: b.features.liveChatOffer,
    } : null;
  }
  const { data } = await createAdminClient()
    .from("bots")
    .select("public_id, name, avatar_color, welcome_message, starter_questions, citations, feedback, lead_capture, lead_fields, lead_timing, live_chat, live_chat_label, live_chat_waiting_message, live_chat_offer, widget")
    .eq("public_id", publicId).eq("status", "active").maybeSingle<Row>();
  if (!data) return null;
  return {
    publicId: data.public_id, name: data.name, avatarColor: data.avatar_color, welcomeMessage: data.welcome_message,
    starterQuestions: data.starter_questions, citations: data.citations, feedback: data.feedback, leadCapture: data.lead_capture,
    leadFields: data.lead_fields, leadTiming: data.lead_timing,
    liveChat: data.live_chat, liveChatLabel: data.live_chat_label, liveChatWaitingMessage: data.live_chat_waiting_message, liveChatOffer: data.live_chat_offer,
    widget: resolveWidget(data.widget, { name: data.name, welcomeMessage: data.welcome_message }),
  };
}
