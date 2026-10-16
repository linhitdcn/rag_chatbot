"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandMenu } from "@/components/layout/command-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { allNavItems } from "@/components/layout/nav";
import { bots, conversations } from "@/lib/mock/data";

const SEGMENT_LABELS: Record<string, string> = { new: "New", settings: "Settings", "api-keys": "API Keys", usage: "Usage & Limits" };

function labelFor(segment: string, href: string) {
  const nav = allNavItems.find((n) => n.href === href);
  if (nav) return nav.title;
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  const bot = bots.find((b) => b.id === segment);
  if (bot) return bot.name;
  if (conversations.some((c) => c.id === segment)) return `Conversation ${segment.replace("conv_", "#")}`;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    return { href, label: labelFor(seg, href), last: i === segments.length - 1 };
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className={c.last ? "min-w-0" : "hidden sm:inline-flex"}>
                {c.last ? (
                  <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild><Link href={c.href}>{c.label}</Link></BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-1.5">
        <CommandMenu />
        <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
          <Link href="/playground"><FlaskConical /> Test bot</Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
