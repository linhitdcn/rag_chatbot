import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { Provider } from "./providers";

export function getLanguageModel(provider: Provider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "openai": return createOpenAI({ apiKey })(modelId);
    case "anthropic": return createAnthropic({ apiKey })(modelId);
    case "google": return createGoogleGenerativeAI({ apiKey })(modelId);
    case "groq": return createGroq({ apiKey })(modelId);
  }
}
