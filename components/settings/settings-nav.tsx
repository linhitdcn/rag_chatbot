"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/usage", label: "Usage & Limits" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={pathname === t.href ? "page" : undefined}
          className={cn("-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors", pathname === t.href ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
