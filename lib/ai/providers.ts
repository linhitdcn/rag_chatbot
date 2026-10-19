/** Single source of truth for supported LLM providers. Client-safe (no secrets, no Node APIs). */
export const PROVIDER_IDS = ["google", "groq", "openai", "anthropic"] as const;
export type Provider = (typeof PROVIDER_IDS)[number];

export interface ProviderInfo {
  name: string;
  envKey: string;
  keyPrefix: string;
  keyUrl: string;
  /** Has a free tier (rate-limited, no card needed). */
  free: boolean;
  models: readonly string[];
  note: string;
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  google: {
    name: "Google Gemini", envKey: "GOOGLE_GENERATIVE_AI_API_KEY", keyPrefix: "AIza", keyUrl: "https://aistudio.google.com/apikey", free: true,
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"], note: "Free tier. Also provides embeddings.",
  },
  groq: {
    name: "Groq", envKey: "GROQ_API_KEY", keyPrefix: "gsk_", keyUrl: "https://console.groq.com/keys", free: true,
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b"], note: "Free tier, very fast open models. Chat only.",
  },
  openai: {
    name: "OpenAI", envKey: "OPENAI_API_KEY", keyPrefix: "sk-", keyUrl: "https://platform.openai.com/api-keys", free: false,
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1"], note: "Paid. Also provides embeddings.",
  },
  anthropic: {
    name: "Anthropic", envKey: "ANTHROPIC_API_KEY", keyPrefix: "sk-ant-", keyUrl: "https://console.anthropic.com/settings/keys", free: false,
    models: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"], note: "Paid. Chat only.",
  },
};

export const EMBEDDING_PROVIDERS = ["google", "openai"] as const;
export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

/** Stored on every chunk; retrieval only matches chunks embedded with the same tag. */
export const EMBEDDING_MODELS: Record<EmbeddingProvider, { id: string; tag: string }> = {
  google: { id: "gemini-embedding-001", tag: "google:gemini-embedding-001@1536" },
  openai: { id: "text-embedding-3-small", tag: "openai:text-embedding-3-small" },
};
export const EMBEDDING_DIMENSIONS = 1536;

export const isProvider = (v: unknown): v is Provider => typeof v === "string" && (PROVIDER_IDS as readonly string[]).includes(v);
