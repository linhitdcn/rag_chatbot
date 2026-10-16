"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, Search, Upload, UserPlus } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { navGroups } from "@/components/layout/nav";

const actions = [
  { title: "Create new chatbot", href: "/bots/new", icon: Plus },
  { title: "Upload a document", href: "/knowledge", icon: Upload },
  { title: "Test a bot in Playground", href: "/playground", icon: FlaskConical },
  { title: "Invite a teammate", href: "/settings/team", icon: UserPlus },
];

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="text-sm font-normal">Search…</span>
        <kbd className="pointer-events-none ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open search" onClick={() => setOpen(true)}>
        <Search />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            {actions.map((a) => (
              <CommandItem key={a.href + a.title} onSelect={() => go(a.href)}>
                <a.icon /> {a.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          {navGroups.map((g) => (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.map((i) => (
                <CommandItem key={i.href} onSelect={() => go(i.href)}>
                  <i.icon /> {i.title}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
