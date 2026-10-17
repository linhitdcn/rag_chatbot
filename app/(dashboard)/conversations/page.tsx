import type { Metadata } from "next";
import { ConversationsTable } from "@/components/conversations/conversations-table";
import { PageHeader } from "@/components/layout/page-header";
import { listBots } from "@/lib/data/bots";
import { listConversations } from "@/lib/data/conversations";
import { getNow } from "@/lib/data/analytics";

export const metadata: Metadata = { title: "Conversations" };

export default async function ConversationsPage() {
  const [conversations, bots, now] = await Promise.all([listConversations(), listBots(), getNow()]);
  return (
    <>
      <PageHeader title="Conversations" description="Every chat your visitors have had with your bots." />
      <ConversationsTable conversations={conversations} bots={bots.map((b) => ({ id: b.id, name: b.name }))} now={now} />
    </>
  );
}
