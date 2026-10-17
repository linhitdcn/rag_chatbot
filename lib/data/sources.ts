import { chunksFor, sources as mockSources } from "@/lib/mock/data";
import type { Chunk, Source } from "@/lib/types";
import { db, fail, getContext, isUuid } from "./context";

export interface SourceRow {
  id: string;
  type: Source["type"];
  name: string;
  status: Source["status"];
  error: string | null;
  url: string | null;
  question: string | null;
  answer: string | null;
  size_bytes: number;
  chunk_count: number;
  last_synced_at: string | null;
  bot_sources: { bot_id: string }[];
}

export const SOURCE_SELECT = "id, type, name, status, error, url, question, answer, size_bytes, chunk_count, last_synced_at, bot_sources(bot_id)";

export function toSource(r: SourceRow): Source {
  return {
    id: r.id, type: r.type, name: r.name, status: r.status, error: r.error ?? undefined,
    chunkCount: r.chunk_count, sizeBytes: Number(r.size_bytes), lastSyncedAt: r.last_synced_at,
    botIds: r.bot_sources.map((b) => b.bot_id),
    url: r.url ?? undefined, question: r.question ?? undefined, answer: r.answer ?? undefined,
  };
}

export async function listSources(): Promise<Source[]> {
  const ctx = await getContext();
  if (ctx.demo) return mockSources;
  const { data, error } = await db(ctx)
    .from("sources").select(SOURCE_SELECT).order("created_at", { ascending: false }).returns<SourceRow[]>();
  fail(error, "Loading sources");
  return (data ?? []).map(toSource);
}

export async function listChunks(sourceId: string, limit = 24): Promise<Chunk[]> {
  const ctx = await getContext();
  if (ctx.demo) {
    const s = mockSources.find((x) => x.id === sourceId);
    return s ? chunksFor(s.id, Math.min(s.chunkCount, limit)) : [];
  }
  if (!isUuid(sourceId)) return [];
  const { data, error } = await db(ctx)
    .from("chunks").select("id, source_id, chunk_index, page, token_count, content")
    .eq("source_id", sourceId).order("chunk_index").limit(limit)
    .returns<{ id: string; source_id: string; chunk_index: number; page: number | null; token_count: number; content: string }[]>();
  fail(error, "Loading chunks");
  return (data ?? []).map((c) => ({
    id: c.id, sourceId: c.source_id, index: c.chunk_index, page: c.page ?? undefined, tokenCount: c.token_count, content: c.content,
  }));
}
