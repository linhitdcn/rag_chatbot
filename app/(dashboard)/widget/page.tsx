import type { Metadata } from "next";
import { WidgetView } from "@/components/widget/widget-view";
import { listBots } from "@/lib/data/bots";

export const metadata: Metadata = { title: "Widget & Embed" };

export default async function WidgetPage() {
  return <WidgetView bots={await listBots()} />;
}
