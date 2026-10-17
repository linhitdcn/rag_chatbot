import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listBots } from "@/lib/data/bots";
import { getContext } from "@/lib/data/context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ctx, bots] = await Promise.all([getContext(), listBots()]);
  return (
    <SidebarProvider>
      <AppSidebar workspace={ctx.workspace} user={ctx.user} />
      <SidebarInset className="min-w-0">
        <Header bots={bots.map((b) => ({ id: b.id, name: b.name }))} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
