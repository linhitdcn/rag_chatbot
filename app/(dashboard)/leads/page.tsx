import type { Metadata } from "next";
import { LeadsTable } from "@/components/leads/leads-table";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return <LeadsTable />;
}
