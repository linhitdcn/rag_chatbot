import type { Metadata } from "next";
import { UsageView } from "@/components/settings/usage-view";
import { getUsage } from "@/lib/data/analytics";
import { getContext } from "@/lib/data/context";

export const metadata: Metadata = { title: "Usage & Limits" };

export default async function UsagePage() {
  const [ctx, usage] = await Promise.all([getContext(), getUsage()]);
  return <UsageView byDay={usage.byDay} monthTokens={usage.monthTokens} initialLimit={ctx.workspace.monthlySpendLimit} canEdit={ctx.role === "owner"} />;
}
