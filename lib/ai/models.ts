import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { Provider } from "./keys";

export function getLanguageModel(provider: Provider, modelId: string, apiKey: string): LanguageModel {
  return provider === "openai" ? createOpenAI({ apiKey })(modelId) : createAnthropic({ apiKey })(modelId);
}
