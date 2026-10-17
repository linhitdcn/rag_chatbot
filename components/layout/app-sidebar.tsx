"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Check, ChevronsUpDown, LogOut, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { navGroups } from "@/components/layout/nav";
import type { CurrentUser, Workspace } from "@/lib/types";
import { isSupabaseConfiguredClient } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function AppSidebar({ workspace, user: currentUser }: { workspace: Workspace; user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();

  async function signOut() {
    if (isSupabaseConfiguredClient) await createClient().auth.signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <BookOpen className="size-4" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{workspace.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{workspace.plan} plan</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="start" side={isMobile ? "bottom" : "right"}>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                <DropdownMenuItem>
                  <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
                    <BookOpen className="size-3" />
                  </div>
                  {workspace.name}
                  <Check className="ml-auto size-4" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info("Workspace creation arrives with the database phase.")}>
                  <Plus /> New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">{initials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{currentUser.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{currentUser.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" side={isMobile ? "bottom" : "right"}>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                  {resolvedTheme === "dark" ? <Sun /> : <Moon />} Toggle theme
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/usage"><Sparkles /> Usage & limits</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
