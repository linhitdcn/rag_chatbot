"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MessageSquare, ThumbsDown, ThumbsUp, UserCheck, AlertCircle } from "lucide-react";
import { DataTable, SortableHeader } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { formatDateTime } from "@/lib/format";
import type { Conversation } from "@/lib/types";

export function ConversationsTable({ conversations, bots, now }: { conversations: Conversation[]; bots: { id: string; name: string }[]; now: string }) {
  const NOW = React.useMemo(() => new Date(now).getTime(), [now]);
  const botName = React.useCallback((id: string) => bots.find((b) => b.id === id)?.name, [bots]);
  const router = useRouter();
  const [bot, setBot] = React.useState("all");
  const [rating, setRating] = React.useState("all");
  const [flag, setFlag] = React.useState("all");
  const [range, setRange] = React.useState<"7" | "30" | "90" | "custom">("90");

  const data = React.useMemo(() => conversations.filter((c) => {
    if (bot !== "all" && c.botId !== bot) return false;
    if (rating === "up" && c.rating !== "up") return false;
    if (rating === "down" && c.rating !== "down") return false;
    if (rating === "none" && c.rating !== null) return false;
    if (flag === "lead" && !c.hasLead) return false;
    if (flag === "unanswered" && !c.unanswered) return false;
    if (range !== "custom" && NOW - new Date(c.startedAt).getTime() > Number(range) * 86_400_000) return false;
    return true;
  }), [conversations, NOW, bot, rating, flag, range]);

  const columns = React.useMemo<ColumnDef<Conversation>[]>(() => [
    {
      accessorKey: "visitor", header: ({ column }) => <SortableHeader column={column}>Visitor</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/conversations/${row.original.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{row.original.visitor}</Link>
          {row.original.hasLead && <UserCheck aria-label="Lead captured" className="size-3.5 text-primary" />}
        </div>
      ),
    },
    { id: "bot", header: "Bot", cell: ({ row }) => <span className="text-muted-foreground">{botName(row.original.botId)}</span> },
    {
      accessorKey: "preview", header: "First message",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="max-w-72 truncate">{row.original.preview}</span>
          {row.original.unanswered && <Badge variant="outline" className="gap-1 border-warning/30 bg-warning/10 text-warning"><AlertCircle className="size-3" /> Unanswered</Badge>}
        </span>
      ),
    },
    { accessorKey: "messageCount", header: ({ column }) => <SortableHeader column={column}>Msgs</SortableHeader>, cell: ({ row }) => <span className="tabular-nums">{row.original.messageCount}</span> },
    {
      accessorKey: "rating", header: "Rating",
      cell: ({ row }) => row.original.rating === "up" ? <ThumbsUp aria-label="Positive" className="size-4 text-success" />
        : row.original.rating === "down" ? <ThumbsDown aria-label="Negative" className="size-4 text-destructive" /> : <span className="text-muted-foreground">—</span>,
    },
    { accessorKey: "startedAt", header: ({ column }) => <SortableHeader column={column}>Started</SortableHeader>, cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.startedAt)}</span> },
  ], [botName]);

  return (
    <DataTable
      columns={columns} data={data} searchColumn="visitor" searchPlaceholder="Search visitor…"
      onRowClick={(c) => router.push(`/conversations/${c.id}`)}
      emptyState={<EmptyState className="m-4 border-0" icon={MessageSquare} title="No conversations match" description="Try widening the date range or clearing a filter." />}
      toolbar={() => (
        <>
          <Select value={bot} onValueChange={setBot}>
            <SelectTrigger className="w-40" aria-label="Filter by bot"><SelectValue placeholder="Bot" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All bots</SelectItem>{bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger className="w-32" aria-label="Filter by rating"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any rating</SelectItem><SelectItem value="up">👍 Positive</SelectItem>
              <SelectItem value="down">👎 Negative</SelectItem><SelectItem value="none">Not rated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={flag} onValueChange={setFlag}>
            <SelectTrigger className="w-36" aria-label="Filter by flag"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chats</SelectItem><SelectItem value="lead">Has lead</SelectItem><SelectItem value="unanswered">Unanswered</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker preset={range} onPresetChange={setRange} onCustomChange={() => undefined} />
        </>
      )}
    />
  );
}
