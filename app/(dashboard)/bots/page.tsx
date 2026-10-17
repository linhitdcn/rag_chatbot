import type { Metadata } from "next";
import Link from "next/link";
import { Bot as BotIcon, BookOpen, MessageSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BotAvatar } from "@/components/shared/bot-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listBots } from "@/lib/data/bots";

export const metadata: Metadata = { title: "Chatbots" };

export default async function BotsPage() {
  const bots = await listBots();
  return (
    <>
      <PageHeader
        title="Chatbots"
        description="Create and configure the assistants that answer from your knowledge."
        actions={<Button asChild><Link href="/bots/new"><Plus /> New bot</Link></Button>}
      />
      {bots.length === 0 ? (
        <EmptyState icon={BotIcon} title="No chatbots yet" description="Create your first bot and connect it to your documents." action={<Button asChild><Link href="/bots/new"><Plus /> Create bot</Link></Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bots.map((b) => (
            <Link key={b.id} href={`/bots/${b.id}`} className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Card className="h-full gap-4 p-5 shadow-none transition-colors group-hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <BotAvatar name={b.name} color={b.avatarColor} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">{b.name}</h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-auto flex items-center gap-5 border-t pt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><BookOpen className="size-4" /> {b.sourceCount} sources</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="size-4" /> {b.conversations30d.toLocaleString()} <span className="text-xs">/ 30d</span></span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
