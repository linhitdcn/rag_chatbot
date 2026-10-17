import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardInput } from "@/lib/data/analytics";
import { listBots } from "@/lib/data/bots";
import { listSources } from "@/lib/data/sources";
import { listUnanswered } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [input, bots, unanswered, sources] = await Promise.all([getDashboardInput(), listBots(), listUnanswered(), listSources()]);
  return (
    <DashboardView
      input={input}
      bots={bots.map((b) => ({ id: b.id, name: b.name }))}
      unanswered={unanswered}
      setup={{ bot: bots.length > 0, source: sources.length > 0 }}
    />
  );
}
