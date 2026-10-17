import { createAdminClient } from "@/lib/supabase/admin";
import { crawl } from "./crawl";
import { approxTokens, chunkText, type TextChunk } from "./chunk";
import { embedTexts } from "./embed";
import { extractFile, MAX_CHARS, type ExtractedPage } from "./extract";

interface SourceRecord {
  id: string;
  workspace_id: string;
  type: "file" | "url" | "qa";
  name: string;
  url: string | null;
  question: string | null;
  answer: string | null;
  storage_path: string | null;
  max_pages: number;
}

const INSERT_BATCH = 100;

async function load(source: SourceRecord): Promise<ExtractedPage[]> {
  const admin = createAdminClient();
  if (source.type === "qa") return [{ text: `Q: ${source.question}\nA: ${source.answer}` }];
  if (source.type === "url") return crawl(source.url!, source.max_pages);
  const { data, error } = await admin.storage.from("documents").download(source.storage_path!);
  if (error || !data) throw new Error(`Couldn't read the uploaded file: ${error?.message ?? "not found"}`);
  return extractFile(source.name, new Uint8Array(await data.arrayBuffer()));
}

/**
 * Extract → chunk → embed → store. Runs with the service-role client (it executes after the response,
 * without the user's cookies), so every query is scoped by the source's own workspace_id.
 */
export async function ingestSource(sourceId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: source } = await admin
    .from("sources")
    .select("id, workspace_id, type, name, url, question, answer, storage_path, max_pages")
    .eq("id", sourceId).maybeSingle<SourceRecord>();
  if (!source) return;

  await admin.from("sources").update({ status: "processing", error: null }).eq("id", sourceId);
  try {
    const pages = await load(source);
    let budget = MAX_CHARS;
    const chunks: TextChunk[] = [];
    for (const p of pages) {
      if (budget <= 0) break;
      const text = p.text.slice(0, budget);
      budget -= text.length;
      chunks.push(...chunkText(text, p.page));
    }
    if (chunks.length === 0) throw new Error("No readable text was found in this source.");

    const embeddings = await embedTexts(source.workspace_id, chunks.map((c) => c.content));

    // Replace old chunks only after the new ones are ready, so a failed re-sync keeps the previous index.
    await admin.from("chunks").delete().eq("source_id", sourceId);
    const rows = chunks.map((c, i) => ({
      workspace_id: source.workspace_id, source_id: sourceId, chunk_index: i, page: c.page ?? null,
      token_count: c.tokenCount || approxTokens(c.content), content: c.content, embedding: JSON.stringify(embeddings[i]),
    }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await admin.from("chunks").insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(error.message);
    }
    await admin.from("sources").update({
      status: "ready", error: null, chunk_count: rows.length, last_synced_at: new Date().toISOString(),
    }).eq("id", sourceId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Processing failed";
    await admin.from("sources").update({ status: "failed", error: message.slice(0, 500) }).eq("id", sourceId);
  }
}
