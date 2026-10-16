import type { Metadata } from "next";
import { BotEditor } from "@/components/bots/bot-editor";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "New chatbot" };

export default function NewBotPage() {
  return (
    <>
      <PageHeader title="New chatbot" description="Configure your bot, then connect knowledge and deploy it." />
      <BotEditor />
    </>
  );
}
