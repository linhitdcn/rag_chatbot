import type { Metadata } from "next";
import { TeamView } from "@/components/settings/team-view";
import { getContext } from "@/lib/data/context";
import { listTeam } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const [ctx, members] = await Promise.all([getContext(), listTeam()]);
  return <TeamView initial={members} canManage={ctx.role === "owner"} />;
}
