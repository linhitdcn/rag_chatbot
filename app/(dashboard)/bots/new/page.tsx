import type { Metadata } from "next";
import { BotEditor } from "@/components/bots/bot-editor";
import { PageHeader } from "@/components/layout/page-header";
import { listSources } from "@/lib/data/sources";

export const metadata: Metadata = { title: "New chatbot" };

export default async function NewBotPage() {
  const sources = await listSources();
  return (
    <>
      <PageHeader title="New chatbot" description="Configure your bot, then connect knowledge and deploy it." />
      <BotEditor sources={sources} />
    </>
  );
}
