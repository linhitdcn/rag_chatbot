"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, SortableHeader, selectColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { QaDialog } from "@/components/knowledge/knowledge-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { createQaSource } from "@/lib/actions/sources";
import { deleteUnanswered, setUnansweredStatus } from "@/lib/actions/workspace";
import type { UnansweredQuestion } from "@/lib/types";

export function UnansweredView({ initial, bots }: { initial: UnansweredQuestion[]; bots: { id: string; name: string }[] }) {
  const [items, setItems] = React.useState<UnansweredQuestion[]>(initial);
  const [active, setActive] = React.useState<UnansweredQuestion | null>(null);
  const [linkIds, setLinkIds] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState<{ ids: string[]; clear: () => void } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const open = React.useMemo(() => items.filter((i) => i.status === "open").sort((a, b) => b.count - a.count), [items]);
  const botName = React.useCallback((id: string) => bots.find((b) => b.id === id)?.name, [bots]);

  const resolve = React.useCallback(async (id: string, status: Exclude<UnansweredQuestion["status"], "open">) => {
    const res = await setUnansweredStatus(id, status);
    if (!res.ok) { toast.error(res.error); return false; }
    setItems((p) => p.map((i) => (i.id === id ? { ...i, status } : i)));
    return true;
  }, []);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    const res = await deleteUnanswered(pending.ids);
    setDeleting(false);
    if (!res.ok) return void toast.error(res.error);
    const gone = new Set(pending.ids);
    setItems((p) => p.filter((i) => !gone.has(i.id)));
    pending.clear();
    toast.success(res.data.deleted === 1 ? "Question deleted" : `${res.data.deleted} questions deleted`);
    setPending(null);
  }

  const columns = React.useMemo<ColumnDef<UnansweredQuestion>[]>(() => [
    selectColumn<UnansweredQuestion>(),
    {
      accessorKey: "question", header: ({ column }) => <SortableHeader column={column}>Question</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate font-medium">{row.original.question}</p>
          {row.original.variants.length > 0 && <p className="truncate text-xs text-muted-foreground">Also: “{row.original.variants.join("”, “")}”</p>}
        </div>
      ),
    },
    { id: "bot", header: "Bot", cell: ({ row }) => <Badge variant="secondary">{botName(row.original.botId) ?? "Deleted bot"}</Badge> },
    { accessorKey: "count", header: ({ column }) => <SortableHeader column={column}>Asks</SortableHeader>, cell: ({ row }) => <span className="tabular-nums">{row.original.count}</span> },
    { accessorKey: "lastSeenAt", header: ({ column }) => <SortableHeader column={column}>Last seen</SortableHeader>, cell: ({ row }) => <span className="text-muted-foreground">{formatRelative(row.original.lastSeenAt)}</span> },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" onClick={() => { setLinkIds([row.original.botId]); setActive(row.original); }}><Plus /> Add answer</Button>
          <Button size="xs" variant="ghost" onClick={async () => { if (await resolve(row.original.id, "dismissed")) toast.success("Question dismissed"); }}><EyeOff /> Dismiss</Button>
        </div>
      ),
    },
  ], [botName, resolve]);

  return (
    <>
      <PageHeader title="Unanswered Questions" description="Questions your bots couldn't answer, grouped by similarity. Turn them into curated answers." />
      <DataTable
        columns={columns} data={open} getRowId={(q) => q.id}
        searchColumn="question" searchPlaceholder="Search questions…" pageSize={10}
        emptyState={<EmptyState className="m-4 border-0" icon={CheckCircle2} title="Inbox zero" description="Every question was answered. New gaps will appear here automatically." />}
        bulkActions={(selected, clear) => (
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setPending({ ids: selected.map((q) => q.id), clear })}>
            <Trash2 /> Delete
          </Button>
        )}
      />
      <ConfirmDialog
        open={!!pending} onOpenChange={(o) => !o && !deleting && setPending(null)}
        title={pending?.ids.length === 1 ? "Delete this question?" : `Delete ${pending?.ids.length ?? 0} questions?`}
        description="They're removed permanently. If a visitor asks the same thing again it will be recorded as a new unanswered question."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={() => void confirmDelete()}
      />
      <QaDialog
        open={!!active} onOpenChange={(o) => !o && setActive(null)} initial={{ question: active?.question }}
        bots={bots} botIds={linkIds} onBotIdsChange={setLinkIds}
        onSave={async (v) => {
          if (!active) return;
          const created = await createQaSource(v, linkIds);
          if (!created.ok) return void toast.error(created.error);
          if (await resolve(active.id, "answered")) toast.success("Answer saved to Knowledge Base");
          setActive(null);
        }}
      />
    </>
  );
}
