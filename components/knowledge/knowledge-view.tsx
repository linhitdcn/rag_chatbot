"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText, Globe, Loader2, MoreHorizontal, Plus, RefreshCw, Trash2, UploadCloud, MessageSquareQuote, Eye, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/shared/data-table";
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
import { getBot, sources as initialSources } from "@/lib/mock/data";
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB, qaSchema, urlSourceSchema, type QaValues, type UrlSourceValues } from "@/lib/validations/knowledge";
import type { Source, SourceType } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeIcon = { file: FileText, url: Globe, qa: MessageSquareQuote } as const;

interface Upload { id: string; name: string; progress: number }

export function KnowledgeView() {
  const [items, setItems] = React.useState<Source[]>(initialSources);
  const [tab, setTab] = React.useState<SourceType>("file");
  const [detail, setDetail] = React.useState<Source | null>(null);
  const [toDelete, setToDelete] = React.useState<Source | null>(null);
  const [qaOpen, setQaOpen] = React.useState(false);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Simulates the pending → processing → ready lifecycle until the real pipeline lands (Phase 3).
  React.useEffect(() => {
    const t = setInterval(() => {
      setItems((prev) => prev.map((s) => (s.status === "processing" && s.id !== "src_3" ? { ...s, status: "ready", lastSyncedAt: new Date().toISOString() } : s)));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  function addSource(partial: Omit<Source, "id" | "status" | "chunkCount" | "lastSyncedAt" | "botIds">) {
    const s: Source = { id: `src_${Date.now()}`, status: "processing", chunkCount: 0, lastSyncedAt: null, botIds: [], ...partial };
    setItems((prev) => [s, ...prev]);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
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
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.botIds.map((id) => getBot(id)?.name).filter(Boolean).join(", ") || "—"}</span>,
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
            <DropdownMenuItem onClick={() => {
              setItems((p) => p.map((s) => (s.id === row.original.id ? { ...s, status: "processing", error: undefined } : s)));
              toast.success("Re-sync started");
            }}><RefreshCw /> Re-sync</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(row.original)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

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
            <p className="text-sm font-medium">Drag & drop files here, or <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => inputRef.current?.click()}>browse</button></p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD, CSV · up to {MAX_FILE_MB} MB each</p>
            <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_EXTENSIONS.join(",")} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          </div>
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

        <TabsContent value="url"><WebsiteForm onAdd={(v) => { addSource({ type: "url", name: v.url, url: v.url, sizeBytes: 0 }); toast.success("Crawl started"); }} /></TabsContent>
        <TabsContent value="qa" className="hidden" />
      </Tabs>

      <DataTable
        key={tab}
        columns={columns}
        data={filtered}
        searchColumn="name"
        searchPlaceholder="Search sources…"
        onRowClick={setDetail}
        emptyState={<EmptyState className="m-4 border-0" {...empty} action={tab === "qa" ? <Button onClick={() => setQaOpen(true)}><Plus /> Add Q&A</Button> : undefined} />}
        bulkActions={(selected, clear) => (
          <Button size="sm" variant="outline" onClick={() => { setItems((p) => p.filter((s) => !selected.includes(s))); clear(); toast.success(`${selected.length} source(s) deleted`); }}>
            <Trash2 /> Delete
          </Button>
        )}
      />

      <QaDialog open={qaOpen} onOpenChange={setQaOpen} onSave={(v) => { addSource({ type: "qa", name: v.question, question: v.question, answer: v.answer, sizeBytes: v.question.length + v.answer.length }); toast.success("Q&A saved"); setQaOpen(false); }} />
      <SourceSheet source={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this source?"
        description={`“${toDelete?.name}” and its ${toDelete?.chunkCount ?? 0} chunks will be permanently removed. Linked bots will stop using it.`}
        confirmLabel="Delete source"
        onConfirm={() => { setItems((p) => p.filter((s) => s.id !== toDelete?.id)); toast.success("Source deleted"); setToDelete(null); }}
      />
    </>
  );
}

function WebsiteForm({ onAdd }: { onAdd: (v: UrlSourceValues) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UrlSourceValues>({
    resolver: zodResolver(urlSourceSchema) as never, defaultValues: { url: "", maxPages: 50 },
  });
  return (
    <form
      onSubmit={handleSubmit(async (v) => { await new Promise((r) => setTimeout(r, 400)); onAdd(v); reset(); })}
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

export function QaDialog({ open, onOpenChange, onSave, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSave: (v: QaValues) => void; initial?: Partial<QaValues>;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QaValues>({
    resolver: zodResolver(qaSchema) as never, defaultValues: { question: initial?.question ?? "", answer: initial?.answer ?? "" },
  });
  React.useEffect(() => { if (open) reset({ question: initial?.question ?? "", answer: initial?.answer ?? "" }); }, [open, initial?.question, initial?.answer, reset]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(async (v) => { await new Promise((r) => setTimeout(r, 300)); onSave(v); })} className="space-y-4" noValidate>
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><X /> Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Save answer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
