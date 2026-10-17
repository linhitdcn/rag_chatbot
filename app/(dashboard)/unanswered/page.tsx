import type { Metadata } from "next";
import { UnansweredView } from "@/components/unanswered/unanswered-view";
import { listBots } from "@/lib/data/bots";
import { listUnanswered } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Unanswered Questions" };

export default async function UnansweredPage() {
  const [items, bots] = await Promise.all([listUnanswered(), listBots()]);
  return <UnansweredView initial={items} bots={bots.map((b) => ({ id: b.id, name: b.name }))} />;
}
