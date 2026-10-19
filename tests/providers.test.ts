import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, EMBEDDING_PROVIDERS, PROVIDERS, PROVIDER_IDS, isProvider } from "@/lib/ai/providers";
import { botSchema, MODELS } from "@/lib/validations/bot";

describe("provider registry", () => {
  it("lists models for every provider and exposes them to the bot form", () => {
    for (const id of PROVIDER_IDS) {
      expect(PROVIDERS[id].models.length).toBeGreaterThan(0);
      expect(MODELS[id]).toBe(PROVIDERS[id].models);
    }
  });
  it("offers at least one free-tier chat provider and a free embedding provider", () => {
    expect(PROVIDER_IDS.some((p) => PROVIDERS[p].free)).toBe(true);
    expect(EMBEDDING_PROVIDERS.some((p) => PROVIDERS[p].free)).toBe(true);
  });
  it("gives every embedding model a distinct tag and the schema's dimension", () => {
    const tags = EMBEDDING_PROVIDERS.map((p) => EMBEDDING_MODELS[p].tag);
    expect(new Set(tags).size).toBe(tags.length);
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });
  it("validates provider ids", () => {
    expect(isProvider("groq")).toBe(true);
    expect(isProvider("mistral")).toBe(false);
  });
  it("accepts the new providers in the bot schema", () => {
    const base = { name: "Bot", description: "", status: "active", systemPrompt: "Be helpful please", tone: "friendly", welcomeMessage: "Hi",
      starterQuestions: [], fallbackMessage: "Sorry", provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.3, maxTokens: 800,
      topK: 5, similarityThreshold: 0.7, sourceIds: [], citations: true, leadCapture: false, leadFields: ["email"], leadTiming: "start",
      handoffEmail: "", feedback: true,
      liveChat: true, liveChatLabel: "Talk to a person", liveChatWaitingMessage: "Hold on", liveChatOffer: "always" };
    expect(botSchema.safeParse(base).success).toBe(true);
    expect(botSchema.safeParse({ ...base, provider: "mistral" }).success).toBe(false);
  });
});
