import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Transcript } from "@/components/conversations/transcript";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { conversations, getBot, leads, transcriptFor } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = conversations.find((c) => c.id === id);
  if (!conv) notFound();
  const lead = leads.find((l) => l.conversationId === id);

  return (
    <>
      <PageHeader
        title={conv.visitor}
        description={`${getBot(conv.botId)?.name} · started ${formatDateTime(conv.startedAt)} · ${conv.messageCount} messages`}
        actions={<Button asChild variant="outline"><Link href="/conversations"><ArrowLeft /> All conversations</Link></Button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="p-5 shadow-none"><Transcript messages={transcriptFor(id)} /></Card>
        <Card className="h-fit gap-3 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Visitor</h2>
          {lead ? (
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Name</dt><dd>{lead.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{lead.email}</dd></div>
              {lead.phone && <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{lead.phone}</dd></div>}
            </dl>
          ) : <p className="text-sm text-muted-foreground">Anonymous visitor — no contact details captured.</p>}
        </Card>
      </div>
    </>
  );
}
