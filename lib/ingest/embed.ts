import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { getProviderKey } from "@/lib/ai/keys";

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, matches chunks.embedding

function model(apiKey: string) {
  return createOpenAI({ apiKey }).embeddingModel(EMBEDDING_MODEL);
}

export async function embedTexts(workspaceId: string, values: string[]): Promise<number[][]> {
  const apiKey = await getProviderKey(workspaceId, "openai");
  if (!apiKey) throw new Error("No OpenAI API key is configured, so documents can't be embedded.");
  const { embeddings } = await embedMany({ model: model(apiKey), values, maxRetries: 3 });
  return embeddings;
}

export async function embedQuery(workspaceId: string, value: string): Promise<number[]> {
  return (await embedTexts(workspaceId, [value]))[0];
}
