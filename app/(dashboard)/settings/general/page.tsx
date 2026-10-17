import type { Metadata } from "next";
import { GeneralForm } from "@/components/settings/general-form";
import { PageHeader } from "@/components/layout/page-header";
import { getContext } from "@/lib/data/context";

export const metadata: Metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  const { workspace, role } = await getContext();
  return (
    <>
      <PageHeader title="General" description="Manage your workspace profile and defaults." />
      <GeneralForm workspace={workspace} canEdit={role === "owner"} />
    </>
  );
}
