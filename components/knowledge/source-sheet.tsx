"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { chunksFor, getBot } from "@/lib/mock/data";
import { formatBytes, formatRelative } from "@/lib/format";
import type { Source } from "@/lib/types";

const PAGE = 5;

export function SourceSheet({ source, onOpenChange }: { source: Source | null; onOpenChange: (open: boolean) => void }) {
  // Page is keyed by source id so switching sources resets to page 1 without an effect.
  const [pageState, setPageState] = React.useState<{ id: string | null; page: number }>({ id: null, page: 0 });
  const page = pageState.id === source?.id ? pageState.page : 0;
  const setPage = (update: (p: number) => number) => setPageState({ id: source?.id ?? null, page: update(page) });

  const chunks = React.useMemo(() => (source ? chunksFor(source.id, Math.min(source.chunkCount, 24)) : []), [source]);
  const pages = Math.max(1, Math.ceil(chunks.length / PAGE));
  const meta = source ? [
    ["Type", source.type.toUpperCase()],
    ["Size", formatBytes(source.sizeBytes)],
    ["Chunks", String(source.chunkCount)],
    ["Last synced", source.lastSyncedAt ? formatRelative(source.lastSyncedAt) : "Never"],
    ["Linked bots", source.botIds.map((id) => getBot(id)?.name).filter(Boolean).join(", ") || "None"],
  ] : [];

  return (
    <Sheet open={!!source} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        {source && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="truncate pr-8">{source.name}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2"><StatusBadge status={source.status} /></div>
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 p-4">
                {source.error && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{source.error}</p>
                )}
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
                  {meta.map(([k, v]) => (<React.Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></React.Fragment>))}
                </dl>

                {source.type === "qa" ? (
                  <div className="space-y-3 text-sm">
                    <div><p className="mb-1 text-xs font-medium text-muted-foreground">Question</p><p>{source.question}</p></div>
                    <div><p className="mb-1 text-xs font-medium text-muted-foreground">Answer</p><p>{source.answer}</p></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Chunks</h3>
                    {chunks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No chunks yet — they appear once processing finishes.</p>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {chunks.slice(page * PAGE, page * PAGE + PAGE).map((c) => (
                            <li key={c.id} className="rounded-lg border p-3">
                              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-mono">#{c.index + 1}{c.page ? ` · p.${c.page}` : ""}</span>
                                <span>{c.tokenCount} tokens</span>
                              </div>
                              <p className="line-clamp-3 text-sm">{c.content}</p>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Page {page + 1} of {pages}</span>
                          <div className="flex gap-1">
                            <Button type="button" variant="outline" size="icon-sm" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></Button>
                            <Button type="button" variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight /></Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
