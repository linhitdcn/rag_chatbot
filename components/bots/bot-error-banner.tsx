import { AlertTriangle } from "lucide-react";
import { PROVIDERS } from "@/lib/ai/providers";
import { formatRelative } from "@/lib/format";
import type { BotError } from "@/lib/types";

/** Shown to admins when the bot's last answer failed (e.g. a free-tier rate limit) so they can switch model. */
export function BotErrorBanner({ error }: { error: BotError }) {
  const title = error.kind === "rate_limit" ? "Rate limit reached" : error.kind === "auth" ? "API key problem" : "Provider error";
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-medium">{title} · {PROVIDERS[error.provider]?.name ?? error.provider} / {error.model} <span className="font-normal text-muted-foreground">({formatRelative(error.at)})</span></p>
        <p className="text-muted-foreground">{error.message} Visitors currently see a generic &ldquo;temporarily unavailable&rdquo; message. It clears after the next successful answer.</p>
      </div>
    </div>
  );
}
