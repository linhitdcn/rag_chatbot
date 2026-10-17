"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, isUuid } from "@/lib/data/context";
import { listChunks, SOURCE_SELECT, toSource, type SourceRow } from "@/lib/data/sources";
import { extensionOf } from "@/lib/ingest/extract";
import { ingestSource } from "@/lib/ingest/run";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Chunk, Source } from "@/lib/types";
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB, qaSchema, urlSourceSchema, type QaValues, type UrlSourceValues } from "@/lib/validations/knowledge";
import { authorize, err, message, ok, type ActionResult } from "./shared";

// Sources are created `pending`, then ingested (extract → chunk → embed) right after the response is sent.

export async function createQaSource(input: QaValues): Promise<ActionResult<Source>> {
  const parsed = qaSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid Q&A");
  const { question, answer } = parsed.data;

  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  if (ctx.demo) {
    return ok({ id: `src_${Date.now()}`, type: "qa", name: question, question, answer, status: "pending", chunkCount: 0, sizeBytes: question.length + answer.length, lastSyncedAt: null, botIds: [] });
  }
  const { data, error } = await db(ctx).from("sources")
    .insert({ workspace_id: ctx.workspace.id, type: "qa", name: question, question, answer, size_bytes: question.length + answer.length })
    .select(SOURCE_SELECT).returns<SourceRow[]>().single();
  if (error) return err(error.message);
  const row = data as unknown as SourceRow;
  after(() => ingestSource(row.id));
  revalidatePath("/knowledge");
  return ok(toSource(row));
}

export async function createUrlSource(input: UrlSourceValues): Promise<ActionResult<Source>> {
  const parsed = urlSourceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid URL");
  const { url, maxPages } = parsed.data;
  if (!/^https?:\/\//i.test(url)) return err("Only http(s) URLs are supported");

  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  if (ctx.demo) {
    return ok({ id: `src_${Date.now()}`, type: "url", name: url, url, status: "pending", chunkCount: 0, sizeBytes: 0, lastSyncedAt: null, botIds: [] });
  }
  const { data, error } = await db(ctx).from("sources")
    .insert({ workspace_id: ctx.workspace.id, type: "url", name: url, url, max_pages: maxPages })
    .select(SOURCE_SELECT).returns<SourceRow[]>().single();
  if (error) return err(error.message);
  const row = data as unknown as SourceRow;
  after(() => ingestSource(row.id));
  revalidatePath("/knowledge");
  return ok(toSource(row));
}

/** Registers a file the browser already uploaded to Storage under "<workspace_id>/…" and starts ingestion. */
export async function createFileSource(input: { path: string; name: string; sizeBytes: number }): Promise<ActionResult<Source>> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  if (ctx.demo) return err("File upload needs Supabase configured.");

  const { path, name, sizeBytes } = input;
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(name))) return err(`${name}: unsupported file type`);
  if (sizeBytes > MAX_FILE_MB * 1024 * 1024) return err(`${name}: larger than ${MAX_FILE_MB} MB`);
  // The object must live in this workspace's folder; Storage RLS enforces the same on upload.
  if (!path.startsWith(`${ctx.workspace.id}/`) || path.includes("..")) return err("Invalid upload path");

  const { data, error } = await db(ctx).from("sources")
    .insert({ workspace_id: ctx.workspace.id, type: "file", name, storage_path: path, size_bytes: sizeBytes })
    .select(SOURCE_SELECT).returns<SourceRow[]>().single();
  if (error) return err(error.message);
  const row = data as unknown as SourceRow;
  after(() => ingestSource(row.id));
  revalidatePath("/knowledge");
  return ok(toSource(row));
}

export async function deleteSources(ids: string[]): Promise<ActionResult> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const valid = ids.filter(isUuid);
  if (!valid.length) return ok();
  const supabase = db(auth.ctx);
  const { data: files } = await supabase.from("sources").select("storage_path").in("id", valid).not("storage_path", "is", null);
  const { error } = await supabase.from("sources").delete().in("id", valid);
  if (error) return err(error.message);
  const paths = (files ?? []).map((f) => f.storage_path as string);
  if (paths.length) await createAdminClient().storage.from("documents").remove(paths);
  revalidatePath("/", "layout");
  return ok();
}

export async function resyncSource(id: string): Promise<ActionResult> {
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  if (!isUuid(id)) return err("Source not found");
  const { data, error } = await db(auth.ctx).from("sources").update({ status: "pending", error: null }).eq("id", id).select("id").maybeSingle();
  if (error) return err(error.message);
  if (!data) return err("Source not found");
  after(() => ingestSource(id));
  revalidatePath("/knowledge");
  return ok();
}

/** Lightweight status poll so the table updates while sources are being processed. */
export async function getSourceStatuses(ids: string[]): Promise<ActionResult<Pick<Source, "id" | "status" | "error" | "chunkCount" | "lastSyncedAt">[]>> {
  const auth = await authorize("viewer");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok([]);
  const valid = ids.filter(isUuid);
  if (!valid.length) return ok([]);
  const { data, error } = await db(auth.ctx).from("sources").select("id, status, error, chunk_count, last_synced_at").in("id", valid)
    .returns<{ id: string; status: Source["status"]; error: string | null; chunk_count: number; last_synced_at: string | null }[]>();
  if (error) return err(error.message);
  return ok((data ?? []).map((r) => ({ id: r.id, status: r.status, error: r.error ?? undefined, chunkCount: r.chunk_count, lastSyncedAt: r.last_synced_at })));
}

export async function getSourceChunks(sourceId: string): Promise<ActionResult<Chunk[]>> {
  try {
    return ok(await listChunks(sourceId));
  } catch (e) {
    return err(message(e));
  }
}
