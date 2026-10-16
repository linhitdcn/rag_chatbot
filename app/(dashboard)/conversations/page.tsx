import type { Metadata } from "next";
import { ConversationsTable } from "@/components/conversations/conversations-table";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Conversations" };

export default function ConversationsPage() {
  return (
    <>
      <PageHeader title="Conversations" description="Every chat your visitors have had with your bots." />
      <ConversationsTable />
    </>
  );
}
