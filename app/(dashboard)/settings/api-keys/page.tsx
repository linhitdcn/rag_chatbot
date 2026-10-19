import type { Metadata } from "next";
import { ApiKeysView } from "@/components/settings/api-keys-view";
import { PageHeader } from "@/components/layout/page-header";
import { getContext } from "@/lib/data/context";
import type { Provider } from "@/lib/ai/providers";
import { getKeyStatus } from "@/lib/data/keys";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const [ctx, status] = await Promise.all([getContext(), getKeyStatus()]);
  return (
    <>
      <PageHeader title="API Keys" description="Bring your own provider keys. They're encrypted server-side and never shown in full again." />
      <ApiKeysView initial={Object.fromEntries(Object.entries(status).map(([p, v]) => [p, v?.last4 ?? null])) as Record<Provider, string | null>} canEdit={ctx.role === "owner"} />
    </>
  );
}
