export type BotStatus = "active" | "paused";
export type SourceType = "file" | "url" | "qa";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";
export type Rating = "up" | "down" | null;
export type Role = "owner" | "editor" | "viewer";

export interface Bot {
  id: string;
  publicId: string;
  name: string;
  description: string;
  status: BotStatus;
  avatarColor: string;
  sourceCount: number;
  conversations30d: number;
  provider: "openai" | "anthropic";
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
  features: {
    citations: boolean;
    leadCapture: boolean;
    leadFields: ("name" | "email" | "phone")[];
    leadTiming: "start" | "after_3" | "on_unanswered";
    handoffEmail: string;
    feedback: boolean;
  };
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

export interface Message {
  id: string;
  role: "user" | "assistant";
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
