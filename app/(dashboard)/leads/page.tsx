import type { Metadata } from "next";
import { LeadsTable } from "@/components/leads/leads-table";
import { listBots } from "@/lib/data/bots";
import { listLeads } from "@/lib/data/conversations";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [leads, bots] = await Promise.all([listLeads(), listBots()]);
  return <LeadsTable leads={leads} bots={bots.map((b) => ({ id: b.id, name: b.name }))} />;
}
