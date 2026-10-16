"use client";

import * as React from "react";
import { Bot as BotIcon, ChevronDown, Clock, Pencil, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { toast } from "sonner";
import { RichText } from "@/components/chat/rich-text";
import { QaDialog } from "@/components/knowledge/knowledge-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

export function Transcript({ messages }: { messages: Message[] }) {
  const [improve, setImprove] = React.useState<{ question: string; answer: string } | null>(null);

  return (
    <>
      <ol className="space-y-5">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <li key={m.id} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", isUser ? "bg-muted" : "bg-primary text-primary-foreground")}>
                {isUser ? <User className="size-4" /> : <BotIcon className="size-4" />}
              </div>
              <div className={cn("max-w-[min(85%,42rem)] space-y-2", isUser && "items-end")}>
                <div className={cn("rounded-2xl px-4 py-2.5", isUser ? "bg-primary text-primary-foreground" : "border bg-card")}>
                  {isUser ? <p className="text-sm">{m.content}</p> : <RichText text={m.content} />}
                </div>

                {!isUser && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {m.unanswered && <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">Unanswered</Badge>}
                      {m.feedback === "up" && <ThumbsUp aria-label="Positive feedback" className="size-3.5 text-success" />}
                      {m.feedback === "down" && <ThumbsDown aria-label="Negative feedback" className="size-3.5 text-destructive" />}
                      <Button
                        size="xs" variant="ghost" className="text-muted-foreground"
                        onClick={() => setImprove({ question: messages[i - 1]?.content ?? "", answer: m.content.replace(/\s?\[\d+\]/g, "") })}
                      ><Pencil /> Improve this answer</Button>
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                          {m.citations.length} source{m.citations.length > 1 ? "s" : ""} · {m.tokens} tokens · <Clock className="size-3" /> {((m.latencyMs ?? 0) / 1000).toFixed(1)}s · {m.model}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {m.citations.map((c) => (
                            <div key={c.n} className="rounded-lg border bg-muted/30 p-3 text-xs">
                              <div className="mb-1 flex items-center gap-2">
                                <Badge variant="secondary" className="size-5 justify-center p-0 font-mono">{c.n}</Badge>
                                <span className="min-w-0 flex-1 truncate font-medium">{c.sourceName}</span>
                                <span className="font-mono text-muted-foreground">{c.score.toFixed(2)}</span>
                              </div>
                              <p className="text-muted-foreground">{c.snippet}</p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <QaDialog
        open={!!improve} onOpenChange={(o) => !o && setImprove(null)} initial={improve ?? undefined}
        onSave={() => { toast.success("Saved as curated Q&A"); setImprove(null); }}
      />
    </>
  );
}
