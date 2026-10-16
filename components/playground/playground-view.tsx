"use client";

import * as React from "react";
import { BookmarkPlus, Bot as BotIcon, Clock, Cpu, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { RichText } from "@/components/chat/rich-text";
import { PageHeader } from "@/components/layout/page-header";
import { BotAvatar } from "@/components/shared/bot-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { QaDialog } from "@/components/knowledge/knowledge-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bots } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

interface RetrievedChunk { n: number; source: string; score: number; text: string }
interface Turn { role: "user" | "assistant"; content: string; streaming?: boolean }
interface Inspect { chunks: RetrievedChunk[]; tokens: number; latencyMs: number; model: string; question: string; answer: string }

const KB: { match: RegExp; answer: string; chunks: RetrievedChunk[] }[] = [
  {
    match: /return|refund/i,
    answer: "You can return items within **30 days** of delivery if they are unused and in the original packaging [1]. Once we receive the item, your refund is issued to the original payment method within 5–7 business days [2].",
    chunks: [
      { n: 1, source: "Shipping & Returns Policy.pdf", score: 0.91, text: "Items can be returned within 30 days of delivery as long as they are unused and in their original packaging." },
      { n: 2, source: "Shipping & Returns Policy.pdf", score: 0.84, text: "Refunds are issued to the original payment method within 5–7 business days after we receive the returned item." },
      { n: 3, source: "https://acme.com/help", score: 0.63, text: "Start a return from your account page under Orders → Request return." },
    ],
  },
  {
    match: /ship|deliver|order|track/i,
    answer: "Orders are processed within 1–2 business days and you'll receive a tracking number by email [1].\n\n- Standard: 3–5 business days\n- Express: 2–3 business days [2]\n- International: 7–14 business days",
    chunks: [
      { n: 1, source: "Shipping & Returns Policy.pdf", score: 0.89, text: "Orders are processed within 1–2 business days. Once your order ships you will receive a tracking number by email." },
      { n: 2, source: "https://acme.com/help", score: 0.8, text: "Express shipping is available at checkout for an additional fee and arrives in 2–3 business days." },
    ],
  },
];

const FALLBACK_CHUNKS: RetrievedChunk[] = [
  { n: 1, source: "Product Catalog 2026.pdf", score: 0.41, text: "Our catalog covers over 400 products across five categories." },
];

export function PlaygroundView() {
  const [botId, setBotId] = React.useState(bots[0].id);
  const bot = bots.find((b) => b.id === botId)!;
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [inspect, setInspect] = React.useState<Inspect | null>(null);
  const [qaOpen, setQaOpen] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function reset() {
    timers.current.forEach(clearTimeout);
    setTurns([]); setInspect(null); setBusy(false);
  }

  // Mock streaming. Phase 4 replaces this with the real /api/chat stream.
  function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput(""); setBusy(true);
    const hit = KB.find((k) => k.match.test(q));
    const passing = (hit?.chunks ?? FALLBACK_CHUNKS).filter((c) => c.score >= bot.similarityThreshold);
    const answer = hit && passing.length ? hit.answer : bot.fallbackMessage;
    setTurns((t) => [...t, { role: "user", content: q }, { role: "assistant", content: "", streaming: true }]);

    const words = answer.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      i += 2;
      const done = i >= words.length;
      setTurns((t) => t.map((turn, idx) => (idx === t.length - 1 ? { ...turn, content: words.slice(0, i).join(""), streaming: !done } : turn)));
      if (done) {
        setBusy(false);
        setInspect({
          chunks: hit?.chunks ?? FALLBACK_CHUNKS, tokens: 180 + answer.length, latencyMs: 700 + answer.length * 6,
          model: bot.model, question: q, answer,
        });
      } else timers.current.push(setTimeout(tick, 45));
    };
    timers.current.push(setTimeout(tick, 500));
  }

  const lastAnswered = inspect?.answer !== bot.fallbackMessage;

  return (
    <>
      <PageHeader
        title="Playground"
        description="Chat with a bot using its real configuration and inspect what it retrieved."
        actions={
          <>
            <Select value={botId} onValueChange={(v) => { setBotId(v); reset(); }}>
              <SelectTrigger className="w-52" aria-label="Choose bot"><SelectValue /></SelectTrigger>
              <SelectContent>{bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={reset}><RotateCcw /> Reset chat</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[480px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-h-[480px] gap-0 overflow-hidden p-0 shadow-none">
          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <BotAvatar name={bot.name} color={bot.avatarColor} className="size-12" />
                <p className="max-w-xs text-sm text-muted-foreground">{bot.welcomeMessage}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {bot.starterQuestions.map((s) => (
                    <Button key={s} size="sm" variant="outline" className="h-auto whitespace-normal py-1.5" onClick={() => send(s)}>{s}</Button>
                  ))}
                </div>
              </div>
            ) : turns.map((t, i) => (
              <div key={i} className={cn("flex gap-3", t.role === "user" && "flex-row-reverse")}>
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", t.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground")}>
                  {t.role === "user" ? <User className="size-3.5" /> : <BotIcon className="size-3.5" />}
                </div>
                <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5", t.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card")}>
                  {t.role === "user" ? <p className="text-sm">{t.content}</p> : t.content ? <RichText text={t.content} /> : <span className="flex gap-1 py-1" aria-label="Thinking"><i className="size-1.5 animate-pulse rounded-full bg-muted-foreground" /><i className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" /><i className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" /></span>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 border-t bg-card p-3"
          >
            <Textarea
              aria-label="Message" rows={1} value={input} placeholder={`Message ${bot.name}…`}
              className="max-h-32 min-h-9 resize-none"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send message"><Send /></Button>
          </form>
        </Card>

        <Card className="min-h-[320px] gap-0 overflow-hidden p-0 shadow-none">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" /> Retrieval inspector</h2>
            {inspect && lastAnswered && (
              <Button size="xs" variant="outline" onClick={() => setQaOpen(true)}><BookmarkPlus /> Copy as Q&A</Button>
            )}
          </div>
          {!inspect ? (
            <EmptyState className="m-4 flex-1 border-0" icon={Sparkles} title="Nothing to inspect yet" description="Ask a question to see the chunks, scores and token usage behind the answer." />
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={Cpu} label="Model" value={inspect.model} />
                <Stat icon={Sparkles} label="Tokens" value={inspect.tokens.toLocaleString()} />
                <Stat icon={Clock} label="Latency" value={`${(inspect.latencyMs / 1000).toFixed(1)}s`} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">Retrieved chunks</h3>
                {inspect.chunks.map((c) => {
                  const used = c.score >= bot.similarityThreshold;
                  return (
                    <div key={c.n} className={cn("space-y-2 rounded-lg border p-3", !used && "opacity-60")}>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="size-5 justify-center p-0 font-mono">{c.n}</Badge>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.source}</span>
                        <span className="font-mono tabular-nums">{c.score.toFixed(2)}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Similarity" aria-valuenow={c.score} aria-valuemin={0} aria-valuemax={1}>
                        <div className={cn("h-full rounded-full", used ? "bg-primary" : "bg-muted-foreground")} style={{ width: `${c.score * 100}%` }} />
                      </div>
                      <p className="line-clamp-3 text-xs text-muted-foreground">{c.text}</p>
                      {!used && <p className="text-[11px] text-muted-foreground">Below threshold ({bot.similarityThreshold}) — not used.</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      <QaDialog
        open={qaOpen} onOpenChange={setQaOpen}
        initial={{ question: inspect?.question, answer: inspect?.answer.replace(/\s?\[\d+\]/g, "") }}
        onSave={() => { toast.success("Saved as curated Q&A"); setQaOpen(false); }}
      />
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 px-2 py-2">
      <Icon className="mx-auto mb-1 size-3.5 text-muted-foreground" />
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
