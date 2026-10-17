"use client";

import * as React from "react";
import { CheckCircle2, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QaDialog } from "@/components/knowledge/knowledge-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { createQaSource } from "@/lib/actions/sources";
import { setUnansweredStatus } from "@/lib/actions/workspace";
import type { UnansweredQuestion } from "@/lib/types";

export function UnansweredView({ initial, bots }: { initial: UnansweredQuestion[]; bots: { id: string; name: string }[] }) {
  const [items, setItems] = React.useState<UnansweredQuestion[]>(initial);
  const [active, setActive] = React.useState<UnansweredQuestion | null>(null);
  const open = items.filter((i) => i.status === "open").sort((a, b) => b.count - a.count);

  async function resolve(id: string, status: Exclude<UnansweredQuestion["status"], "open">) {
    const res = await setUnansweredStatus(id, status);
    if (!res.ok) { toast.error(res.error); return false; }
    setItems((p) => p.map((i) => (i.id === id ? { ...i, status } : i)));
    return true;
  }

  return (
    <>
      <PageHeader title="Unanswered Questions" description="Questions your bots couldn't answer, grouped by similarity. Turn them into curated answers." />
      {open.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Inbox zero" description="Every question was answered. New gaps will appear here automatically." />
      ) : (
        <ul className="space-y-3">
          {open.map((q) => (
            <li key={q.id}>
              <Card className="flex-row flex-wrap items-center gap-4 p-4 shadow-none">
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                  <span className="text-sm font-semibold leading-none tabular-nums">{q.count}</span>
                  <span className="text-[10px] text-muted-foreground">asks</span>
                </div>
                <div className="min-w-0 flex-1 basis-60">
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{bots.find((b) => b.id === q.botId)?.name}</Badge>
                    <span>last seen {formatRelative(q.lastSeenAt)}</span>
                    {q.variants.length > 0 && <span className="truncate">Also: “{q.variants.join("”, “")}”</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setActive(q)}><Plus /> Add answer</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (await resolve(q.id, "dismissed")) toast.success("Question dismissed"); }}><EyeOff /> Dismiss</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <QaDialog
        open={!!active} onOpenChange={(o) => !o && setActive(null)} initial={{ question: active?.question }}
        onSave={async (v) => {
          if (!active) return;
          const created = await createQaSource(v);
          if (!created.ok) return void toast.error(created.error);
          if (await resolve(active.id, "answered")) toast.success("Answer saved to Knowledge Base");
          setActive(null);
        }}
      />
    </>
  );
}
