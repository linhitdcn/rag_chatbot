export type BotStatus = "active" | "paused";
export type SourceType = "file" | "url" | "qa";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";
export type Rating = "up" | "down" | null;
export type Role = "owner" | "editor" | "viewer";

import type { EmbeddingProvider, Provider } from "@/lib/ai/providers";
import type { WidgetSettings } from "@/lib/validations/widget";

export interface Bot {
  id: string;
  publicId: string;
  name: string;
  description: string;
  status: BotStatus;
  avatarColor: string;
  sourceCount: number;
  conversations30d: number;
  provider: Provider;
  model: string;
  tone: "friendly" | "professional" | "concise";
  systemPrompt: string;
  welcomeMessage: string;
  fallbackMessage: string;
  starterQuestions: string[];
  temperature: number;
  maxTokens: number;
  topK: number;
  similarityThreshold: number;
  sourceIds: string[];
  widget: WidgetSettings;
  /** Set when the last answer failed (e.g. rate limit); cleared on the next success. */
  lastError?: BotError | null;
  features: {
    citations: boolean;
    leadCapture: boolean;
    leadFields: ("name" | "email" | "phone")[];
    leadTiming: "start" | "after_3" | "on_unanswered";
    handoffEmail: string;
    feedback: boolean;
    liveChat: boolean;
    liveChatLabel: string;
    liveChatWaitingMessage: string;
    liveChatOffer: "always" | "on_unanswered";
  };
}

export interface BotError {
  kind: "rate_limit" | "auth" | "provider" | "error";
  provider: Provider;
  model: string;
  message: string;
  at: string;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  status: SourceStatus;
  error?: string;
  chunkCount: number;
  sizeBytes: number;
  lastSyncedAt: string | null;
  botIds: string[];
  url?: string;
  question?: string;
  answer?: string;
}

export interface Chunk {
  id: string;
  sourceId: string;
  index: number;
  page?: number;
  tokenCount: number;
  content: string;
}

export interface Citation {
  n: number;
  sourceName: string;
  score: number;
  snippet: string;
}

export type ConversationMode = "bot" | "waiting" | "human";

export interface Message {
  id: string;
  role: "user" | "assistant" | "agent";
  agentName?: string;
  content: string;
  createdAt: string;
  citations?: Citation[];
  tokens?: number;
  latencyMs?: number;
  model?: string;
  unanswered?: boolean;
  feedback?: Rating;
}

export interface Conversation {
  id: string;
  visitor: string;
  botId: string;
  preview: string;
  messageCount: number;
  rating: Rating;
  hasLead: boolean;
  unanswered: boolean;
  startedAt: string;
  mode: ConversationMode;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  botId: string;
  conversationId: string;
  capturedAt: string;
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  variants: string[];
  botId: string;
  count: number;
  lastSeenAt: string;
  status: "open" | "answered" | "dismissed";
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited";
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  timezone: string;
  monthlySpendLimit: number;
  embeddingProvider: EmbeddingProvider;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface DashboardData {
  kpis: { key: string; label: string; value: string; delta: number }[];
  series: { date: string; label: string; conversations: number }[];
  messagesByBot: { bot: string; botId: string; messages: number }[];
  topQuestions: { question: string; count: number }[];
  unanswered: UnansweredQuestion[];
  recent: Conversation[];
}

export interface UsageData {
  byDay: { label: string; tokens: number }[];
  monthSpendUsd: number;
}
