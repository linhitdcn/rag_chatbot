import type { Metadata } from "next";
import { ApiKeysView } from "@/components/settings/api-keys-view";
import { PageHeader } from "@/components/layout/page-header";
import { getContext } from "@/lib/data/context";
import { getKeyStatus } from "@/lib/data/keys";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const [ctx, status] = await Promise.all([getContext(), getKeyStatus()]);
  return (
    <>
      <PageHeader title="API Keys" description="Bring your own provider keys. They're encrypted server-side and never shown in full again." />
      <ApiKeysView initial={{ openai: status.openai?.last4 ?? null, anthropic: status.anthropic?.last4 ?? null }} canEdit={ctx.role === "owner"} />
    </>
  );
}
