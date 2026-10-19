"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PROVIDER_IDS, PROVIDERS, type Provider } from "@/lib/ai/providers";
import { removeProviderKey, saveProviderKey, testProviderKey } from "@/lib/actions/keys";
import { apiKeySchema } from "@/lib/validations/settings";

const providers = PROVIDER_IDS.map((id) => ({ id, ...PROVIDERS[id], prefix: PROVIDERS[id].keyPrefix }));
const blank = () => Object.fromEntries(PROVIDER_IDS.map((p) => [p, ""])) as Record<Provider, string>;

export function ApiKeysView({ initial, canEdit }: { initial: Record<Provider, string | null>; canEdit: boolean }) {
  // Only the masked last4 is ever held in the browser; the full key is encrypted server-side.
  const [saved, setSaved] = React.useState<Record<Provider, string | null>>(initial);
  const [draft, setDraft] = React.useState<Record<Provider, string>>(blank);
  const [error, setError] = React.useState<Record<Provider, string>>(blank);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<Provider | null>(null);

  async function save(p: Provider) {
    const r = apiKeySchema.safeParse({ key: draft[p] });
    if (!r.success) return void setError((e) => ({ ...e, [p]: r.error.issues[0].message }));
    setError((e) => ({ ...e, [p]: "" })); setBusy(`save-${p}`);
    const res = await saveProviderKey(p, draft[p]);
    setBusy(null);
    if (!res.ok) return void setError((e) => ({ ...e, [p]: res.error }));
    setSaved((s) => ({ ...s, [p]: res.data.last4 })); setDraft((d) => ({ ...d, [p]: "" }));
    toast.success("API key verified and saved securely");
  }
  async function test(p: Provider) {
    setBusy(`test-${p}`);
    const res = await testProviderKey(p);
    setBusy(null);
    if (res.ok) toast.success(`${providers.find((x) => x.id === p)?.name} connection OK`);
    else toast.error(res.error);
  }

  return (
    <div className="grid max-w-3xl gap-4">
      {providers.map((p) => (
        <Card key={p.id} className="shadow-none">
          <CardHeader className="flex-row items-start justify-between">
            <div className="space-y-1.5"><CardTitle className="flex items-center gap-2">{p.name}{p.free && <Badge variant="secondary">Free tier</Badge>}</CardTitle><CardDescription>{p.note} <a href={p.keyUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">Get a key</a></CardDescription></div>
            {saved[p.id] ? <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success"><CheckCircle2 className="size-3" /> Connected</Badge> : <Badge variant="outline">Not set</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {saved[p.id] && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                <code className="flex-1 font-mono text-sm">{p.prefix}…{saved[p.id]}</code>
                <Button size="sm" variant="outline" onClick={() => test(p.id)} disabled={busy === `test-${p.id}`}>{busy === `test-${p.id}` && <Loader2 className="animate-spin" />} Test connection</Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.name} key`} disabled={!canEdit} onClick={() => setRemoving(p.id)}><Trash2 /></Button>
              </div>
            )}
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void save(p.id); }}>
              <div className="flex-1 space-y-1">
                <Input aria-label={`${p.name} API key`} disabled={!canEdit} type="password" autoComplete="off" placeholder={saved[p.id] ? "Paste a new key to replace" : `${p.prefix}…`}
                  className="font-mono" value={draft[p.id]} aria-invalid={!!error[p.id]} onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))} />
                {error[p.id] && <p role="alert" className="text-xs text-destructive">{error[p.id]}</p>}
              </div>
              <Button type="submit" disabled={!canEdit || busy === `save-${p.id}`}>{busy === `save-${p.id}` && <Loader2 className="animate-spin" />} {saved[p.id] ? "Replace key" : "Save key"}</Button>
            </form>
          </CardContent>
        </Card>
      ))}
      <ConfirmDialog
        open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove this API key?"
        description="Bots using this provider will stop answering until you add a new key."
        confirmLabel="Remove key"
        onConfirm={async () => {
          if (removing) {
            const res = await removeProviderKey(removing);
            if (res.ok) { setSaved((s) => ({ ...s, [removing]: null })); toast.success("API key removed"); } else toast.error(res.error);
          }
          setRemoving(null);
        }}
      />
    </div>
  );
}
