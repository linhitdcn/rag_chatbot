import type { Metadata } from "next";
import { ApiKeysView } from "@/components/settings/api-keys-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "API Keys" };

export default function ApiKeysPage() {
  return (
    <>
      <PageHeader title="API Keys" description="Bring your own provider keys. They're encrypted server-side and never shown in full again." />
      <ApiKeysView />
    </>
  );
}
