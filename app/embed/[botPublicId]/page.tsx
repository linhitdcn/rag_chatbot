import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/embed/chat-widget";
import { getPublicBot } from "@/lib/data/public";
import { isHostAllowed } from "@/lib/validations/widget";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

export default async function EmbedPage({ params, searchParams }: {
  params: Promise<{ botPublicId: string }>; searchParams: Promise<{ preview?: string }>;
}) {
  const [{ botPublicId }, { preview }, h] = await Promise.all([params, searchParams, headers()]);
  const bot = await getPublicBot(botPublicId);
  if (!bot) notFound();

  // Domain allow-list: when embedded, the browser sends the parent page as Referer (the loader sets
  // referrerpolicy="origin"). Opening the URL directly (not in an iframe) is allowed so owners can test it.
  const dest = h.get("sec-fetch-dest");
  const embedded = dest === "iframe" || dest === "frame";
  let host: string | null = null;
  try { host = h.get("referer") ? new URL(h.get("referer")!).host : null; } catch { /* ignore */ }
  const ownHost = h.get("host");
  if (embedded && bot.widget.domains.length > 0 && host !== ownHost && !(host && isHostAllowed(host, bot.widget.domains))) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-muted-foreground">
        This chat isn&apos;t available on this website.
      </div>
    );
  }
  return <ChatWidget bot={bot} embedded={embedded && preview !== "1"} />;
}
