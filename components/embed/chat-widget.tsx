"use client";

import * as React from "react";
import { Headset, Loader2, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { RichText } from "@/components/chat/rich-text";
import { BotAvatar } from "@/components/shared/bot-avatar";
import { readChatEvents } from "@/lib/chat/client";
import type { RetrievedChunk } from "@/lib/chat/types";
import type { PublicBot } from "@/lib/data/public";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  messageId?: string | null;
  role: "user" | "assistant" | "agent";
  agentName?: string;
  content: string;
  streaming?: boolean;
  unanswered?: boolean;
  feedback?: "up" | "down" | null;
  sources?: RetrievedChunk[];
}

type Mode = "bot" | "waiting" | "human";

interface LeadValues { name: string; email: string; phone: string }

const uid = () => Math.random().toString(36).slice(2);

const memoryIds = new Map<string, string>();

/** Stable anonymous id per browser + bot. Read lazily (on send), so it never runs during server render. */
function getVisitorId(botId: string) {
  // localStorage can throw (private mode, blocked third-party storage in an iframe): fall back to a per-load id.
  const key = `kd_visitor_${botId}`;
  let v = memoryIds.get(key) ?? "";
  try { v = localStorage.getItem(key) ?? v; } catch { /* ignore */ }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(v)) v = crypto.randomUUID().replace(/-/g, "");
  memoryIds.set(key, v);
  try { localStorage.setItem(key, v); } catch { /* ignore */ }
  return v;
}

export function ChatWidget({ bot, embedded }: { bot: PublicBot; embedded: boolean }) {
  const color = bot.widget.color;
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [leadState, setLeadState] = React.useState<"idle" | "done" | "skipped">("idle");
  const [pendingLead, setPendingLead] = React.useState<LeadValues | null>(null);
  const [openSources, setOpenSources] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("bot");
  const [handoffBusy, setHandoffBusy] = React.useState(false);
  const [handoffError, setHandoffError] = React.useState("");
  const lastAgentAt = React.useRef<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, leadState]);
  React.useEffect(() => () => abort.current?.abort(), []);

  // Once a conversation exists, poll for agent replies and mode changes (faster while a person is involved).
  React.useEffect(() => {
    if (!conversationId) return;
    const visitorId = getVisitorId(bot.publicId);
    let stopped = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const qs = new URLSearchParams({ botPublicId: bot.publicId, visitorId, conversationId });
        if (lastAgentAt.current) qs.set("after", lastAgentAt.current);
        const res = await fetch(`/api/chat/poll?${qs}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { mode: Mode; messages: { id: string; content: string; agentName: string; createdAt: string }[] };
        setMode(data.mode);
        if (data.messages.length) {
          lastAgentAt.current = data.messages[data.messages.length - 1].createdAt;
          setMsgs((all) => {
            const known = new Set(all.map((m) => m.messageId));
            const fresh = data.messages.filter((m) => !known.has(m.id));
            return fresh.length ? [...all, ...fresh.map((m) => ({ id: uid(), messageId: m.id, role: "agent" as const, agentName: m.agentName, content: m.content }))] : all;
          });
        }
      } catch { /* offline: try again on the next tick */ }
    };
    const t = setInterval(() => void tick(), mode === "bot" ? 10_000 : 3_000);
    void tick();
    return () => { stopped = true; clearInterval(t); };
  }, [conversationId, mode, bot.publicId]);

  const userCount = msgs.filter((m) => m.role === "user").length;
  const last = msgs[msgs.length - 1];
  const showLead = bot.leadCapture && leadState === "idle" && !busy && (
    (bot.leadTiming === "start" && msgs.length === 0) ||
    (bot.leadTiming === "after_3" && userCount >= 3) ||
    (bot.leadTiming === "on_unanswered" && last?.role === "assistant" && !!last.unanswered)
  );

  const canOfferHuman = bot.liveChat && !!conversationId && mode === "bot" && !busy
    && (bot.liveChatOffer === "always" || (last?.role === "assistant" && !!last.unanswered));

  async function postJson(path: string, body: unknown) {
    return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  async function submitLead(values: LeadValues, convId: string | null) {
    const visitorId = getVisitorId(bot.publicId);
    if (!convId) { setPendingLead(values); setLeadState("done"); return; } // sent once the first message creates the conversation
    const res = await postJson("/api/chat/lead", { botPublicId: bot.publicId, visitorId, conversationId: convId, ...values });
    if (res.ok) setLeadState("done");
    else throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save your details");
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const visitorId = getVisitorId(bot.publicId);
    setInput(""); setBusy(true);
    const history = [...msgs.map(({ role, content }) => ({ role: role === "agent" ? "assistant" as const : role, content })), { role: "user" as const, content: q }];
    const reply: Msg = { id: uid(), role: "assistant", content: "", streaming: true };
    setMsgs((m) => [...m, { id: uid(), role: "user", content: q }, reply]);
    const patch = (fn: (m: Msg) => Msg) => setMsgs((all) => all.map((m) => (m.id === reply.id ? fn(m) : m)));

    const controller = new AbortController();
    abort.current = controller;
    let answer = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ botPublicId: bot.publicId, visitorId, conversationId, messages: history }),
      });
      for await (const ev of readChatEvents(res)) {
        if (ev.t === "meta") patch((m) => ({ ...m, sources: ev.chunks }));
        else if (ev.t === "delta") { answer += ev.text; patch((m) => ({ ...m, content: answer })); }
        else if (ev.t === "human") {
          // A person is handling this chat: no bot reply is coming, so drop the empty placeholder.
          setMode(ev.mode);
          setMsgs((all) => all.filter((m) => m.id !== reply.id));
        }
        else if (ev.t === "error") patch((m) => ({ ...m, content: ev.message, streaming: false }));
        else if (ev.t === "done") {
          patch((m) => ({ ...m, streaming: false, messageId: ev.messageId, unanswered: ev.unanswered }));
          if (ev.conversationId) {
            setConversationId(ev.conversationId);
            if (pendingLead) { const lead = pendingLead; setPendingLead(null); void postJson("/api/chat/lead", { botPublicId: bot.publicId, visitorId, conversationId: ev.conversationId, ...lead }); }
          }
        }
      }
    } catch {
      if (!controller.signal.aborted) patch((m) => ({ ...m, content: "Sorry, something went wrong. Please try again.", streaming: false }));
    } finally {
      patch((m) => ({ ...m, streaming: false }));
      setBusy(false);
    }
  }

  async function requestHuman() {
    if (!conversationId || handoffBusy) return;
    setHandoffBusy(true); setHandoffError("");
    try {
      const res = await postJson("/api/chat/handoff", { botPublicId: bot.publicId, visitorId: getVisitorId(bot.publicId), conversationId });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't reach the team. Please try again.");
      setMode(((await res.json()) as { mode: Mode }).mode);
    } catch (e) {
      setHandoffError(e instanceof Error ? e.message : "Couldn't reach the team. Please try again.");
    } finally {
      setHandoffBusy(false);
    }
  }

  async function rate(msg: Msg, rating: "up" | "down") {
    if (!msg.messageId || !conversationId) return;
    const visitorId = getVisitorId(bot.publicId);
    const next = msg.feedback === rating ? null : rating;
    setMsgs((all) => all.map((m) => (m.id === msg.id ? { ...m, feedback: next } : m)));
    await postJson("/api/chat/feedback", { botPublicId: bot.publicId, visitorId, conversationId, messageId: msg.messageId, rating: next }).catch(() => undefined);
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ backgroundColor: color }}>
        <BotAvatar name={bot.name} color="rgba(255,255,255,0.22)" className="size-8 text-white" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{bot.widget.title || bot.name}</h1>
        {embedded && (
          <button type="button" aria-label="Close chat" className="rounded p-1.5 hover:bg-white/15" onClick={() => window.parent.postMessage({ type: "kd:close" }, "*")}>
            <X className="size-4" />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        <Bubble role="assistant" color={color}>{bot.widget.welcome || bot.welcomeMessage}</Bubble>

        {msgs.length === 0 && bot.starterQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {bot.starterQuestions.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border px-3 py-1.5 text-left text-xs hover:bg-accent">{s}</button>
            ))}
          </div>
        )}

        {msgs.map((m) => m.role === "agent" ? (
          <div key={m.id} className="flex flex-col items-start gap-1">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Headset className="size-3" /> {m.agentName ?? "Support team"}</p>
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm">{m.content}</div>
          </div>
        ) : (
          <div key={m.id} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
            <Bubble role={m.role} color={color}>
              {m.role === "assistant" ? (
                m.content ? <RichText text={m.content} onCite={(n) => setOpenSources(openSources === `${m.id}:${n}` ? null : `${m.id}:${n}`)} />
                  : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Thinking" />
              ) : m.content}
            </Bubble>
            {openSources?.startsWith(`${m.id}:`) && bot.citations && (() => {
              const src = m.sources?.find((s) => s.n === Number(openSources.split(":")[1]));
              return src ? (
                <div className="max-w-[85%] rounded-lg border bg-muted/40 p-2.5 text-xs">
                  <p className="mb-1 font-medium">{src.source}</p>
                  <p className="line-clamp-4 text-muted-foreground">{src.text}</p>
                </div>
              ) : null;
            })()}
            {m.role === "assistant" && !m.streaming && m.messageId && bot.feedback && (
              <div className="flex gap-1 text-muted-foreground">
                {(["up", "down"] as const).map((r) => (
                  <button key={r} type="button" aria-label={r === "up" ? "Helpful" : "Not helpful"} aria-pressed={m.feedback === r}
                    onClick={() => void rate(m, r)} className={cn("rounded p-1 hover:bg-accent", m.feedback === r && "bg-accent text-foreground")}>
                    {r === "up" ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {mode === "waiting" && (
          <p role="status" className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Headset className="mr-1 inline size-3.5" /> {bot.liveChatWaitingMessage}
          </p>
        )}
        {showLead && (
          <LeadCard fields={bot.leadFields} color={color} onSkip={() => setLeadState("skipped")} onSubmit={(v) => submitLead(v, conversationId)} />
        )}
        <div ref={endRef} />
      </div>

      {canOfferHuman && (
        <div className="flex items-center justify-between gap-2 border-t px-3 pt-2 text-xs">
          <button type="button" onClick={() => void requestHuman()} disabled={handoffBusy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60">
            {handoffBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Headset className="size-3.5" />} {bot.liveChatLabel}
          </button>
          {handoffError && <span role="alert" className="text-destructive">{handoffError}</span>}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className={cn("flex items-end gap-2 p-3", !canOfferHuman && "border-t")}>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={2000} aria-label="Message"
          placeholder="Type a message…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          className="max-h-28 min-h-9 flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-white disabled:opacity-50" style={{ backgroundColor: color }}>
          <Send className="size-4" />
        </button>
      </form>
      {bot.widget.poweredBy && <p className="pb-2 text-center text-[10px] text-muted-foreground">Powered by KnowledgeDesk</p>}
    </div>
  );
}

function Bubble({ role, color, children }: { role: "user" | "assistant"; color: string; children: React.ReactNode }) {
  return role === "user"
    ? <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white" style={{ backgroundColor: color }}>{children}</div>
    : <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">{typeof children === "string" ? <p className="text-sm">{children}</p> : children}</div>;
}

function LeadCard({ fields, color, onSubmit, onSkip }: {
  fields: PublicBot["leadFields"]; color: string; onSubmit: (v: LeadValues) => Promise<void>; onSkip: () => void;
}) {
  const [values, setValues] = React.useState<LeadValues>({ name: "", email: "", phone: "" });
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const labels = { name: "Name", email: "Email", phone: "Phone" } as const;
  return (
    <form
      className="space-y-2.5 rounded-xl border bg-card p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (fields.includes("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return setError("Enter a valid email address");
        setSaving(true); setError("");
        try { await onSubmit(values); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save your details"); } finally { setSaving(false); }
      }}
    >
      <p className="text-sm font-medium">Leave your details so we can follow up</p>
      {fields.map((f) => (
        <div key={f} className="space-y-1">
          <label htmlFor={`lead-${f}`} className="text-xs text-muted-foreground">{labels[f]}</label>
          <input
            id={`lead-${f}`} type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={values[f]}
            onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} required={f === "email"} maxLength={200}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60" style={{ backgroundColor: color }}>
          {saving ? "Saving…" : "Submit"}
        </button>
        <button type="button" onClick={onSkip} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">Not now</button>
      </div>
    </form>
  );
}
