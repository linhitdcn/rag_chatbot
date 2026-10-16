import type { Metadata } from "next";
import { GeneralForm } from "@/components/settings/general-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "General settings" };

export default function GeneralSettingsPage() {
  return (
    <>
      <PageHeader title="General" description="Manage your workspace profile and defaults." />
      <GeneralForm />
    </>
  );
}
