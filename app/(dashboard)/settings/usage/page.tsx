import type { Metadata } from "next";
import { UsageView } from "@/components/settings/usage-view";

export const metadata: Metadata = { title: "Usage & Limits" };

export default function UsagePage() {
  return <UsageView />;
}
