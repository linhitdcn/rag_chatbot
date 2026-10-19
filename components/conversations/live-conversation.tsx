"use client";

import * as React from "react";
import { Bot as BotIcon, Headset, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Transcript } from "@/components/conversations/transcript";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { pollConversation, sendAgentReply, setConversationMode } from "@/lib/actions/conversations";
import type { ConversationMode, Message } from "@/lib/types";

const POLL_MS = 4000;

/** The agent's view of one conversation: transcript that refreshes itself, plus take-over and reply controls. */
export function LiveConversation({ id, initialMessages, initialMode, canReply, demo, bots, botId }: {
  id: string; initialMessages: Message[]; initialMode: ConversationMode; canReply: boolean; demo: boolean;
  bots: { id: string; name: string }[]; botId: string;
}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [mode, setMode] = React.useState(initialMode);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState<"send" | "mode" | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const count = messages.length;

  // Poll for new visitor messages and mode changes (skipped while the tab is hidden, and in demo mode).
  React.useEffect(() => {
    if (demo) return;
    const tick = async () => {
      if (document.hidden) return;
      const res = await pollConversation(id);
      if (!res.ok) return;
      setMode(res.data.mode);
      setMessages((prev) => (res.data.messages.length === prev.length && res.data.messages.at(-1)?.id === prev.at(-1)?.id ? prev : res.data.messages));
    };
    const t = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(t);
  }, [id, demo]);

  React.useEffect(() => { if (count > initialMessages.length) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [count, initialMessages.length]);

  async function changeMode(next: "human" | "bot") {
    setBusy("mode");
    const res = await setConversationMode(id, next);
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    setMode(res.data.mode);
    toast.success(next === "human" ? "You're now handling this chat — the bot is paused." : "Handed back to the bot.");
  }

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy("send");
    const res = await sendAgentReply(id, content);
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    setText("");
    setMode(res.data.mode);
    setMessages((prev) => (prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]));
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  }

  return (
    <Card className="gap-0 p-0 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          {mode === "bot" && <Badge variant="secondary" className="gap-1"><BotIcon className="size-3" /> Bot is answering</Badge>}
          {mode === "waiting" && <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-warning"><Headset className="size-3" /> Visitor is waiting for a person</Badge>}
          {mode === "human" && <Badge variant="outline" className="gap-1 border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"><Headset className="size-3" /> A person is handling this chat</Badge>}
        </div>
        {canReply && (
          mode === "human"
            ? <Button size="sm" variant="outline" disabled={busy === "mode"} onClick={() => void changeMode("bot")}>{busy === "mode" ? <Loader2 className="animate-spin" /> : <BotIcon />} Hand back to bot</Button>
            : <Button size="sm" disabled={busy === "mode"} onClick={() => void changeMode("human")}>{busy === "mode" ? <Loader2 className="animate-spin" /> : <Headset />} Take over</Button>
        )}
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-5"><Transcript messages={messages} bots={bots} botId={botId} /><div ref={endRef} /></div>

      {canReply ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} aria-label="Reply to visitor"
            placeholder={mode === "human" ? "Reply to the visitor…" : "Replying here takes over the chat from the bot…"}
            className="min-h-10 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          />
          <Button type="submit" disabled={busy !== null || !text.trim()} aria-label="Send reply">{busy === "send" ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
        </form>
      ) : (
        <p className="border-t px-5 py-3 text-sm text-muted-foreground">Viewers can read conversations but can&apos;t reply.</p>
      )}
    </Card>
  );
}
