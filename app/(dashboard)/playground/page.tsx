import type { Metadata } from "next";
import { PlaygroundView } from "@/components/playground/playground-view";
import { listBots } from "@/lib/data/bots";
import { getContext } from "@/lib/data/context";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage() {
  const [ctx, bots] = await Promise.all([getContext(), listBots()]);
  return <PlaygroundView bots={bots} demo={ctx.demo} />;
}
