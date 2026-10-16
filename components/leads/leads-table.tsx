"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, SortableHeader } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { bots, getBot, leads } from "@/lib/mock/data";
import type { Lead } from "@/lib/types";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function LeadsTable() {
  const [bot, setBot] = React.useState("all");
  const data = React.useMemo(() => leads.filter((l) => bot === "all" || l.botId === bot), [bot]);

  function exportCsv() {
    const rows = [["Name", "Email", "Phone", "Bot", "Conversation", "Captured at"], ...data.map((l) => [l.name, l.email, l.phone, getBot(l.botId)?.name ?? "", l.conversationId, l.capturedAt])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "leads.csv" });
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} leads`);
  }

  const columns = React.useMemo<ColumnDef<Lead>[]>(() => [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <a className="hover:underline" href={`mailto:${row.original.email}`}>{row.original.email}</a> },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || "—"}</span> },
    { id: "bot", header: "Bot", cell: ({ row }) => <span className="text-muted-foreground">{getBot(row.original.botId)?.name}</span> },
    { id: "conv", header: "Conversation", cell: ({ row }) => <Link className="text-primary hover:underline" href={`/conversations/${row.original.conversationId}`}>View chat</Link> },
    { accessorKey: "capturedAt", header: ({ column }) => <SortableHeader column={column}>Captured</SortableHeader>, cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.capturedAt)}</span> },
  ], []);

  return (
    <>
      <PageHeader title="Leads" description="Contacts captured by your chatbots." actions={<Button onClick={exportCsv} disabled={!data.length}><Download /> Export CSV</Button>} />
      <DataTable
        columns={columns} data={data} searchColumn="name" searchPlaceholder="Search leads…"
        emptyState={<EmptyState className="m-4 border-0" icon={UserPlus} title="No leads yet" description="Enable lead capture on a bot and contacts will show up here." />}
        toolbar={() => (
          <Select value={bot} onValueChange={setBot}>
            <SelectTrigger className="w-44" aria-label="Filter by bot"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All bots</SelectItem>{bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      />
    </>
  );
}
