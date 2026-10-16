import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { BotEditor } from "@/components/bots/bot-editor";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getBot } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Edit chatbot" };

export default async function BotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = getBot(id);
  if (!bot) notFound();
  return (
    <>
      <PageHeader
        title={bot.name}
        description={bot.description}
        actions={
          <>
            <StatusBadge status={bot.status} />
            <Button asChild variant="outline"><Link href="/playground"><FlaskConical /> Test in Playground</Link></Button>
          </>
        }
      />
      <BotEditor bot={bot} />
    </>
  );
}
