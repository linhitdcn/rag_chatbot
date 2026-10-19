import type { Metadata } from "next";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { listBots } from "@/lib/data/bots";
import { getContext } from "@/lib/data/context";
import { listSources } from "@/lib/data/sources";

// Ingestion (extract, chunk, embed) runs after the action responds and shares this limit.
export const maxDuration = 60;

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgePage() {
  const [ctx, sources, bots] = await Promise.all([getContext(), listSources(), listBots()]);
  return <KnowledgeView initialSources={sources} bots={bots.map((b) => ({ id: b.id, name: b.name }))} demo={ctx.demo} workspaceId={ctx.workspace.id} />;
}
