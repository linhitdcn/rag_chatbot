import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { getProviderKey } from "@/lib/ai/keys";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, PROVIDERS, type EmbeddingProvider } from "@/lib/ai/providers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EmbeddingResult {
  embeddings: number[][];
  /** Tag stored on each chunk; retrieval only compares vectors with the same tag. */
  model: string;
}

export async function getEmbeddingProvider(workspaceId: string): Promise<EmbeddingProvider> {
  const { data } = await createAdminClient().from("workspaces").select("embedding_provider").eq("id", workspaceId).maybeSingle();
  return (data?.embedding_provider as EmbeddingProvider | undefined) ?? "google";
}

/** `task` lets Gemini optimize the vector for documents vs. queries; OpenAI ignores it. */
export async function embedTexts(workspaceId: string, values: string[], task: "document" | "query" = "document"): Promise<EmbeddingResult> {
  const provider = await getEmbeddingProvider(workspaceId);
  const apiKey = await getProviderKey(workspaceId, provider);
  if (!apiKey) {
    throw new Error(`No ${PROVIDERS[provider].name} API key is configured, so text can't be embedded. Add one in Settings → API Keys.`);
  }
  const { id, tag } = EMBEDDING_MODELS[provider];

  if (provider === "google") {
    const { embeddings } = await embedMany({
      model: createGoogleGenerativeAI({ apiKey }).embeddingModel(id), values, maxRetries: 3,
      providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT" } },
    });
    return { embeddings, model: tag };
  }
  const { embeddings } = await embedMany({ model: createOpenAI({ apiKey }).embeddingModel(id), values, maxRetries: 3 });
  return { embeddings, model: tag };
}

export async function embedQuery(workspaceId: string, value: string): Promise<EmbeddingResult & { embedding: number[] }> {
  const r = await embedTexts(workspaceId, [value], "query");
  return { ...r, embedding: r.embeddings[0] };
}
