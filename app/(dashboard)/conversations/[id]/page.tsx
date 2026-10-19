import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LiveConversation } from "@/components/conversations/live-conversation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getBot, listBots } from "@/lib/data/bots";
import { getContext } from "@/lib/data/context";
import { getConversation } from "@/lib/data/conversations";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [found, ctx] = await Promise.all([getConversation(id), getContext()]);
  if (!found) notFound();
  const { conversation: conv, messages, lead } = found;
  const [bot, allBots] = await Promise.all([getBot(conv.botId), listBots()]);

  return (
    <>
      <PageHeader
        title={conv.visitor}
        description={`${bot?.name ?? "Deleted bot"} · started ${formatDateTime(conv.startedAt)} · ${conv.messageCount} messages`}
        actions={<Button asChild variant="outline"><Link href="/conversations"><ArrowLeft /> All conversations</Link></Button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <LiveConversation id={conv.id} initialMessages={messages} initialMode={conv.mode} canReply={ctx.role !== "viewer"} demo={ctx.demo} bots={allBots.map((b) => ({ id: b.id, name: b.name }))} botId={conv.botId} />
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
