"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiKeySchema } from "@/lib/validations/settings";

type Provider = "openai" | "anthropic";
const providers: { id: Provider; name: string; prefix: string }[] = [
  { id: "openai", name: "OpenAI", prefix: "sk-" },
  { id: "anthropic", name: "Anthropic", prefix: "sk-ant-" },
];

export function ApiKeysView() {
  // Only the masked last4 is ever held in the browser. Encryption + storage arrive in Phase 6.
  const [saved, setSaved] = React.useState<Record<Provider, string | null>>({ openai: "9f2c", anthropic: null });
  const [draft, setDraft] = React.useState<Record<Provider, string>>({ openai: "", anthropic: "" });
  const [error, setError] = React.useState<Record<Provider, string>>({ openai: "", anthropic: "" });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<Provider | null>(null);

  async function save(p: Provider) {
    const r = apiKeySchema.safeParse({ key: draft[p] });
    if (!r.success) return void setError((e) => ({ ...e, [p]: r.error.issues[0].message }));
    setError((e) => ({ ...e, [p]: "" })); setBusy(`save-${p}`);
    await new Promise((res) => setTimeout(res, 600));
    setSaved((s) => ({ ...s, [p]: draft[p].slice(-4) })); setDraft((d) => ({ ...d, [p]: "" })); setBusy(null);
    toast.success("API key saved securely");
  }
  async function test(p: Provider) {
    setBusy(`test-${p}`);
    await new Promise((res) => setTimeout(res, 800));
    setBusy(null);
    toast.success(`${providers.find((x) => x.id === p)?.name} connection OK`);
  }

  return (
    <div className="grid max-w-3xl gap-4">
      {providers.map((p) => (
        <Card key={p.id} className="shadow-none">
          <CardHeader className="flex-row items-start justify-between">
            <div className="space-y-1.5"><CardTitle>{p.name}</CardTitle><CardDescription>Used for chat completions{p.id === "openai" ? " and embeddings" : ""}.</CardDescription></div>
            {saved[p.id] ? <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success"><CheckCircle2 className="size-3" /> Connected</Badge> : <Badge variant="outline">Not set</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {saved[p.id] && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                <code className="flex-1 font-mono text-sm">{p.prefix}…{saved[p.id]}</code>
                <Button size="sm" variant="outline" onClick={() => test(p.id)} disabled={busy === `test-${p.id}`}>{busy === `test-${p.id}` && <Loader2 className="animate-spin" />} Test connection</Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.name} key`} onClick={() => setRemoving(p.id)}><Trash2 /></Button>
              </div>
            )}
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void save(p.id); }}>
              <div className="flex-1 space-y-1">
                <Input aria-label={`${p.name} API key`} type="password" autoComplete="off" placeholder={saved[p.id] ? "Paste a new key to replace" : `${p.prefix}…`}
                  className="font-mono" value={draft[p.id]} aria-invalid={!!error[p.id]} onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))} />
                {error[p.id] && <p role="alert" className="text-xs text-destructive">{error[p.id]}</p>}
              </div>
              <Button type="submit" disabled={busy === `save-${p.id}`}>{busy === `save-${p.id}` && <Loader2 className="animate-spin" />} {saved[p.id] ? "Replace key" : "Save key"}</Button>
            </form>
          </CardContent>
        </Card>
      ))}
      <ConfirmDialog
        open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove this API key?"
        description="Bots using this provider will stop answering until you add a new key."
        confirmLabel="Remove key"
        onConfirm={() => { if (removing) setSaved((s) => ({ ...s, [removing]: null })); toast.success("API key removed"); setRemoving(null); }}
      />
    </div>
  );
}
