"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Headset, Trash2, MessageSquare, ThumbsDown, ThumbsUp, UserCheck, AlertCircle } from "lucide-react";
import { DataTable, SortableHeader, selectColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteConversations } from "@/lib/actions/conversations";
import { formatDateTime } from "@/lib/format";
import type { Conversation } from "@/lib/types";

export function ConversationsTable({ conversations, bots, now }: { conversations: Conversation[]; bots: { id: string; name: string }[]; now: string }) {
  const NOW = React.useMemo(() => new Date(now).getTime(), [now]);
  const botName = React.useCallback((id: string) => bots.find((b) => b.id === id)?.name, [bots]);
  const router = useRouter();
  const [bot, setBot] = React.useState("all");
  const [rating, setRating] = React.useState("all");
  const [flag, setFlag] = React.useState("all");
  const [removed, setRemoved] = React.useState<Set<string>>(() => new Set());
  const [pending, setPending] = React.useState<{ ids: string[]; clear: () => void } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [range, setRange] = React.useState<"7" | "30" | "90" | "custom">("90");

  const data = React.useMemo(() => conversations.filter((c) => {
    if (removed.has(c.id)) return false;
    if (bot !== "all" && c.botId !== bot) return false;
    if (rating === "up" && c.rating !== "up") return false;
    if (rating === "down" && c.rating !== "down") return false;
    if (rating === "none" && c.rating !== null) return false;
    if (flag === "lead" && !c.hasLead) return false;
    if (flag === "unanswered" && !c.unanswered) return false;
    if (flag === "human" && c.mode === "bot") return false;
    if (range !== "custom" && NOW - new Date(c.startedAt).getTime() > Number(range) * 86_400_000) return false;
    return true;
  }), [conversations, removed, NOW, bot, rating, flag, range]);

  const columns = React.useMemo<ColumnDef<Conversation>[]>(() => [
    selectColumn<Conversation>(),
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
          {row.original.mode === "waiting" && <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive"><Headset className="size-3" /> Needs a person</Badge>}
          {row.original.mode === "human" && <Badge variant="outline" className="gap-1 border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"><Headset className="size-3" /> Live</Badge>}
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

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    const res = await deleteConversations(pending.ids);
    setDeleting(false);
    if (!res.ok) return void toast.error(res.error);
    setRemoved((prev) => new Set([...prev, ...pending.ids]));
    pending.clear();
    toast.success(res.data.deleted === 1 ? "Conversation deleted" : `${res.data.deleted} conversations deleted`);
    setPending(null);
    router.refresh();
  }

  return (
    <>
    <DataTable
      getRowId={(c) => c.id}
      bulkActions={(selected, clear) => (
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setPending({ ids: selected.map((c) => c.id), clear })}>
          <Trash2 /> Delete
        </Button>
      )}
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
              <SelectItem value="all">All chats</SelectItem><SelectItem value="lead">Has lead</SelectItem><SelectItem value="unanswered">Unanswered</SelectItem><SelectItem value="human">Needs / has a person</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker preset={range} onPresetChange={setRange} onCustomChange={() => undefined} />
        </>
      )}
    />
    <ConfirmDialog
      open={!!pending} onOpenChange={(o) => !o && !deleting && setPending(null)}
      title={pending?.ids.length === 1 ? "Delete this conversation?" : `Delete ${pending?.ids.length ?? 0} conversations?`}
      description="The messages in these chats are permanently removed. Any contact details already captured stay in Leads."
      confirmLabel={deleting ? "Deleting…" : "Delete"}
      onConfirm={() => void confirmDelete()}
    />
    </>
  );
}
