"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText, Globe, Link2, Loader2, MoreHorizontal, Plus, RefreshCw, Trash2, UploadCloud, MessageSquareQuote, Eye, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, SortableHeader, selectColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SourceSheet } from "@/components/knowledge/source-sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, formatRelative } from "@/lib/format";
import { createFileSource, createQaSource, createUrlSource, deleteSources, getSourceStatuses, resyncSource, setSourceBots } from "@/lib/actions/sources";
import { BotPicker } from "@/components/knowledge/bot-picker";
import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB, qaSchema, urlSourceSchema, type QaValues, type UrlSourceValues } from "@/lib/validations/knowledge";
import type { Source, SourceType } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeIcon = { file: FileText, url: Globe, qa: MessageSquareQuote } as const;

interface Upload { id: string; name: string; progress: number }

export function KnowledgeView({ initialSources, bots, demo, workspaceId }: { initialSources: Source[]; bots: { id: string; name: string }[]; demo: boolean; workspaceId: string }) {
  const [items, setItems] = React.useState<Source[]>(initialSources);
  const botName = React.useCallback((id: string) => bots.find((b) => b.id === id)?.name, [bots]);
  const [tab, setTab] = React.useState<SourceType>("file");
  const [detail, setDetail] = React.useState<Source | null>(null);
  const [toDelete, setToDelete] = React.useState<Source | null>(null);
  const [qaOpen, setQaOpen] = React.useState(false);
  // New sources default to being used by every bot, so a fresh Q&A/file/site works in chat right away.
  const [newBotIds, setNewBotIds] = React.useState<string[]>(() => bots.map((b) => b.id));
  const [linking, setLinking] = React.useState<Source | null>(null);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Demo mode only: simulates the pending → processing → ready lifecycle.
  React.useEffect(() => {
    if (!demo) return;
    const t = setInterval(() => {
      setItems((prev) => prev.map((s) => (s.status === "processing" && s.id !== "src_3" ? { ...s, status: "ready", lastSyncedAt: new Date().toISOString() } : s)));
    }, 4000);
    return () => clearInterval(t);
  }, [demo]);

  // Real mode: poll while anything is still being processed server-side.
  const pendingIds = items.filter((s) => s.status === "pending" || s.status === "processing").map((s) => s.id).join(",");
  React.useEffect(() => {
    if (demo || !pendingIds) return;
    const t = setInterval(async () => {
      const res = await getSourceStatuses(pendingIds.split(","));
      if (!res.ok) return;
      const byId = new Map(res.data.map((r) => [r.id, r]));
      setItems((prev) => prev.map((s) => (byId.has(s.id) ? { ...s, ...byId.get(s.id) } : s)));
    }, 3000);
    return () => clearInterval(t);
  }, [demo, pendingIds]);

  function addSource(partial: Omit<Source, "id" | "status" | "chunkCount" | "lastSyncedAt" | "botIds">) {
    const s: Source = { id: `src_${Date.now()}`, status: "processing", chunkCount: 0, lastSyncedAt: null, botIds: [], ...partial };
    setItems((prev) => [s, ...prev]);
  }

  const resync = React.useCallback(async (source: Source) => {
    const res = await resyncSource(source.id);
    if (!res.ok) return void toast.error(res.error);
    setItems((p) => p.map((s) => (s.id === source.id ? { ...s, status: demo ? "processing" : "pending", error: undefined } : s)));
    toast.success("Re-sync queued");
  }, [demo]);

  async function remove(ids: string[]) {
    const res = await deleteSources(ids);
    if (!res.ok) return false;
    setItems((p) => p.filter((s) => !ids.includes(s.id)));
    return true;
  }

  async function createRemote(create: () => ReturnType<typeof createQaSource>, success: string) {
    const res = await create();
    if (!res.ok) return void toast.error(res.error);
    setItems((prev) => [demo ? { ...res.data, status: "processing" } : res.data, ...prev]);
    toast.success(success);
    return true;
  }

  /** Uploads straight to Storage (no server body-size limit), then registers the source to start ingestion. */
  async function uploadFile(file: File) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return void toast.error(`${file.name}: unsupported file type`);
    if (file.size > MAX_FILE_MB * 1024 * 1024) return void toast.error(`${file.name}: larger than ${MAX_FILE_MB} MB`);
    const id = `up_${Date.now()}_${file.name}`;
    setUploads((u) => [...u, { id, name: file.name, progress: 30 }]);
    try {
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${workspaceId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await createClient().storage.from("documents").upload(path, file, { contentType: file.type || undefined });
      if (error) return void toast.error(`${file.name}: ${error.message}`);
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: 80 } : x)));
      await createRemote(() => createFileSource({ path, name: file.name, sizeBytes: file.size, botIds: newBotIds }), `${file.name} uploaded — processing started`);
    } finally {
      setUploads((u) => u.filter((x) => x.id !== id));
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    if (!demo) return void Array.from(files).forEach((file) => void uploadFile(file));
    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) return void toast.error(`${file.name}: unsupported file type`);
      if (file.size > MAX_FILE_MB * 1024 * 1024) return void toast.error(`${file.name}: larger than ${MAX_FILE_MB} MB`);
      const id = `up_${Date.now()}_${file.name}`;
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
      const timer = setInterval(() => {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: Math.min(100, x.progress + 20) } : x)));
      }, 250);
      setTimeout(() => {
        clearInterval(timer);
        setUploads((u) => u.filter((x) => x.id !== id));
        addSource({ type: "file", name: file.name, sizeBytes: file.size });
        toast.success(`${file.name} uploaded — processing started`);
      }, 1400);
    });
  }

  const columns = React.useMemo<ColumnDef<Source>[]>(() => [
    selectColumn<Source>(),
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => {
        const Icon = typeIcon[row.original.type];
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="max-w-64 truncate font-medium">{row.original.name}</span>
          </div>
        );
      },
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "chunkCount", header: ({ column }) => <SortableHeader column={column}>Chunks</SortableHeader>, cell: ({ row }) => <span className="tabular-nums">{row.original.chunkCount}</span> },
    { accessorKey: "sizeBytes", header: ({ column }) => <SortableHeader column={column}>Size</SortableHeader>, cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatBytes(row.original.sizeBytes)}</span> },
    { accessorKey: "lastSyncedAt", header: "Last synced", cell: ({ row }) => <span className="text-muted-foreground">{row.original.lastSyncedAt ? formatRelative(row.original.lastSyncedAt) : "—"}</span> },
    {
      id: "bots", header: "Linked bots",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.botIds.map((id) => botName(id)).filter(Boolean).join(", ") || "—"}</span>,
    },
    {
      id: "actions", header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.name}`} onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setDetail(row.original)}><Eye /> View chunks</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLinking(row.original)}><Link2 /> Link to chatbots…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void resync(row.original)}><RefreshCw /> Re-sync</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(row.original)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [botName, resync]);

  const filtered = items.filter((s) => s.type === tab);
  const empty = {
    file: { icon: FileText, title: "No files yet", description: "Upload PDFs, Word docs or text files to train your bot." },
    url: { icon: Globe, title: "No websites yet", description: "Add a page or sitemap and we'll crawl it for you." },
    qa: { icon: MessageSquareQuote, title: "No curated answers yet", description: "Write exact answers for important questions — they take priority over documents." },
  }[tab];

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Everything your bots know — files, websites and curated answers."
        actions={<Button onClick={() => (tab === "qa" ? setQaOpen(true) : tab === "file" ? inputRef.current?.click() : document.getElementById("site-url")?.focus())}><Plus /> Add {tab === "file" ? "file" : tab === "url" ? "website" : "Q&A"}</Button>}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as SourceType)} className="gap-5">
        <TabsList>
          <TabsTrigger value="file"><FileText /> Files</TabsTrigger>
          <TabsTrigger value="url"><Globe /> Websites</TabsTrigger>
          <TabsTrigger value="qa"><MessageSquareQuote /> Q&A</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            className={cn("flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors", dragging ? "border-primary bg-primary/5" : "bg-muted/20")}
          >
            <UploadCloud className="mb-3 size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium"><span>Drag & drop files here, or</span>{" "}<button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => inputRef.current?.click()}>browse</button></p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD, CSV · up to {MAX_FILE_MB} MB each</p>
            <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_EXTENSIONS.join(",")} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <BotPicker bots={bots} value={newBotIds} onChange={setNewBotIds} idPrefix="file-bots" />
          {uploads.length > 0 && (
            <ul className="space-y-2">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  <Progress value={u.progress} className="h-1.5 w-32" />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-4"><WebsiteForm onAdd={async (v) => createRemote(() => createUrlSource(v, newBotIds), demo ? "Crawl started" : "Website added — crawling started")} />
          <BotPicker bots={bots} value={newBotIds} onChange={setNewBotIds} idPrefix="url-bots" /></TabsContent>
        <TabsContent value="qa" className="hidden" />
      </Tabs>

      <DataTable
        key={tab}
        getRowId={(s) => s.id}
        columns={columns}
        data={filtered}
        searchColumn="name"
        searchPlaceholder="Search sources…"
        onRowClick={setDetail}
        emptyState={<EmptyState className="m-4 border-0" {...empty} action={tab === "qa" ? <Button onClick={() => setQaOpen(true)}><Plus /> Add Q&A</Button> : undefined} />}
        bulkActions={(selected, clear) => (
          <Button size="sm" variant="outline" onClick={async () => { if (await remove(selected.map((s) => s.id))) { clear(); toast.success(`${selected.length} source(s) deleted`); } else toast.error("Couldn't delete the selected sources"); }}>
            <Trash2 /> Delete
          </Button>
        )}
      />

      <QaDialog open={qaOpen} onOpenChange={setQaOpen} bots={bots} botIds={newBotIds} onBotIdsChange={setNewBotIds} onSave={async (v) => { if (await createRemote(() => createQaSource(v, newBotIds), "Q&A saved")) setQaOpen(false); }} />
      <LinkBotsDialog
        source={linking} bots={bots} onClose={() => setLinking(null)}
        onSaved={(id, botIds) => setItems((p) => p.map((s) => (s.id === id ? { ...s, botIds } : s)))}
      />
      <SourceSheet source={detail} botNames={bots} onOpenChange={(o) => !o && setDetail(null)} />
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this source?"
        description={`“${toDelete?.name}” and its ${toDelete?.chunkCount ?? 0} chunks will be permanently removed. Linked bots will stop using it.`}
        confirmLabel="Delete source"
        onConfirm={async () => { if (toDelete && (await remove([toDelete.id]))) toast.success("Source deleted"); else toast.error("Couldn't delete the source"); setToDelete(null); }}
      />
    </>
  );
}

function WebsiteForm({ onAdd }: { onAdd: (v: UrlSourceValues) => Promise<boolean | void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UrlSourceValues>({
    resolver: zodResolver(urlSourceSchema) as never, defaultValues: { url: "", maxPages: 50 },
  });
  return (
    <form
      onSubmit={handleSubmit(async (v) => { if (await onAdd(v)) reset(); })}
      className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-start"
      noValidate
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="site-url">Website or sitemap URL</Label>
        <Input id="site-url" placeholder="https://example.com/sitemap.xml" aria-invalid={!!errors.url} {...register("url")} />
        {errors.url && <p role="alert" className="text-xs text-destructive">{errors.url.message}</p>}
      </div>
      <div className="w-full space-y-1.5 sm:w-32">
        <Label htmlFor="max-pages">Max pages</Label>
        <Input id="max-pages" type="number" aria-invalid={!!errors.maxPages} {...register("maxPages", { valueAsNumber: true })} />
        {errors.maxPages && <p role="alert" className="text-xs text-destructive">{errors.maxPages.message}</p>}
      </div>
      <Button type="submit" className="sm:mt-[22px]" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Start crawl</Button>
    </form>
  );
}

export function QaDialog({ open, onOpenChange, onSave, initial, bots, botIds, onBotIdsChange }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSave: (v: QaValues) => void | Promise<void>; initial?: Partial<QaValues>;
  /** When given, the dialog lets the user choose which chatbots will use this answer. */
  bots?: { id: string; name: string }[]; botIds?: string[]; onBotIdsChange?: (ids: string[]) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QaValues>({
    resolver: zodResolver(qaSchema) as never, defaultValues: { question: initial?.question ?? "", answer: initial?.answer ?? "" },
  });
  React.useEffect(() => { if (open) reset({ question: initial?.question ?? "", answer: initial?.answer ?? "" }); }, [open, initial?.question, initial?.answer, reset]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(async (v) => { await onSave(v); })} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Curated Q&A</DialogTitle>
            <DialogDescription>Exact answers are retrieved with priority over document chunks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="qa-question">Question</Label>
            <Input id="qa-question" aria-invalid={!!errors.question} {...register("question")} />
            {errors.question && <p role="alert" className="text-xs text-destructive">{errors.question.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-answer">Answer</Label>
            <Textarea id="qa-answer" rows={5} aria-invalid={!!errors.answer} {...register("answer")} />
            {errors.answer && <p role="alert" className="text-xs text-destructive">{errors.answer.message}</p>}
          </div>
          {bots && botIds && onBotIdsChange && <BotPicker bots={bots} value={botIds} onChange={onBotIdsChange} idPrefix="qa-bots" />}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><X /> Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Save answer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkBotsDialog({ source, bots, onClose, onSaved }: {
  source: Source | null; bots: { id: string; name: string }[]; onClose: () => void; onSaved: (id: string, botIds: string[]) => void;
}) {
  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      {/* Keyed by source so the checkbox state starts from that source's current links. */}
      {source && <LinkBotsForm key={source.id} source={source} bots={bots} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function LinkBotsForm({ source, bots, onClose, onSaved }: {
  source: Source; bots: { id: string; name: string }[]; onClose: () => void; onSaved: (id: string, botIds: string[]) => void;
}) {
  const [ids, setIds] = React.useState<string[]>(source.botIds);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const res = await setSourceBots(source.id, ids);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    onSaved(source.id, res.data.botIds);
    toast.success("Chatbots updated");
    onClose();
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Link to chatbots</DialogTitle>
        <DialogDescription className="truncate">Choose which chatbots can answer from “{source.name}”.</DialogDescription>
      </DialogHeader>
      <BotPicker bots={bots} value={ids} onChange={setIds} idPrefix="link-bots" />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>{saving && <Loader2 className="animate-spin" />} Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
