"use client";

import * as React from "react";
import { Bot as BotIcon, MessageCircle, Monitor, Plus, Send, Smartphone, X, Sparkle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { bots } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

const COLORS = ["#4f46e5", "#7c3aed", "#0ea5e9", "#059669", "#e11d48", "#18181b"];
const ICONS = { chat: MessageCircle, bot: BotIcon, sparkle: Sparkle, help: HelpCircle } as const;
type IconKey = keyof typeof ICONS;

export function WidgetView() {
  const [botId, setBotId] = React.useState(bots[0].id);
  const bot = bots.find((b) => b.id === botId)!;
  const [color, setColor] = React.useState(COLORS[0]);
  const [position, setPosition] = React.useState<"right" | "left">("right");
  const [icon, setIcon] = React.useState<IconKey>("chat");
  const [title, setTitle] = React.useState(bot.name);
  const [welcome, setWelcome] = React.useState(bot.welcomeMessage);
  const [powered, setPowered] = React.useState(true);
  const [domains, setDomains] = React.useState<string[]>(["acme.com"]);
  const [domainInput, setDomainInput] = React.useState("");
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [open, setOpen] = React.useState(true);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://YOUR_DOMAIN";
  const snippet = `<script src="${origin}/widget.js" data-bot-id="${bot.publicId}" defer></script>`;
  const Launcher = ICONS[icon];

  function addDomain() {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || !/^[a-z0-9*.-]+\.[a-z]{2,}$/.test(d)) return void toast.error("Enter a valid domain, e.g. example.com");
    if (domains.includes(d)) return void toast.error("Domain already added");
    setDomains([...domains, d]); setDomainInput("");
  }

  return (
    <>
      <PageHeader title="Widget & Embed" description="Customize the chat widget and paste one line of code on your site." actions={<Button onClick={() => toast.success("Widget settings saved")}>Save changes</Button>} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Make it match your brand.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="w-bot">Bot</Label>
                <Select value={botId} onValueChange={(v) => { setBotId(v); const b = bots.find((x) => x.id === v)!; setTitle(b.name); setWelcome(b.welcomeMessage); }}>
                  <SelectTrigger id="w-bot" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary color</Label>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Primary color">
                  {COLORS.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                      className={cn("size-7 rounded-full ring-offset-2 ring-offset-background transition", color === c && "ring-2 ring-ring")} style={{ backgroundColor: c }} />
                  ))}
                  <Input aria-label="Custom color hex" value={color} onChange={(e) => setColor(e.target.value)} className="ml-1 h-8 w-28 font-mono text-xs" maxLength={7} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <ToggleGroup type="single" variant="outline" value={position} onValueChange={(v) => v && setPosition(v as "left" | "right")} className="w-full">
                    <ToggleGroupItem value="left" className="flex-1">Left</ToggleGroupItem>
                    <ToggleGroupItem value="right" className="flex-1">Right</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <Label>Launcher icon</Label>
                  <ToggleGroup type="single" variant="outline" value={icon} onValueChange={(v) => v && setIcon(v as IconKey)} className="w-full">
                    {(Object.keys(ICONS) as IconKey[]).map((k) => { const I = ICONS[k]; return <ToggleGroupItem key={k} value={k} aria-label={k} className="flex-1"><I /></ToggleGroupItem>; })}
                  </ToggleGroup>
                </div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="w-title">Header title</Label><Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} /></div>
              <div className="space-y-1.5"><Label htmlFor="w-welcome">Welcome text</Label><Input id="w-welcome" value={welcome} onChange={(e) => setWelcome(e.target.value)} maxLength={200} /></div>
              <div className="flex items-center justify-between">
                <Label htmlFor="w-powered">Show “Powered by KnowledgeDesk”</Label>
                <Switch id="w-powered" checked={powered} onCheckedChange={setPowered} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Allowed domains</CardTitle><CardDescription>The widget only loads on these domains.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addDomain(); }}>
                <Input aria-label="Add domain" placeholder="example.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
                <Button type="submit" variant="outline"><Plus /> Add</Button>
              </form>
              <ul className="flex flex-wrap gap-2">
                {domains.map((d) => (
                  <li key={d} className="flex items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5 font-mono text-xs">
                    {d}
                    <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${d}`} onClick={() => setDomains(domains.filter((x) => x !== d))}><X /></Button>
                  </li>
                ))}
                {domains.length === 0 && <li className="text-xs text-muted-foreground">No restrictions — the widget loads on any domain.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="gap-0 overflow-hidden p-0 shadow-none">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Live preview</span>
              <ToggleGroup type="single" variant="outline" size="sm" value={device} onValueChange={(v) => v && setDevice(v as "desktop" | "mobile")}>
                <ToggleGroupItem value="desktop" aria-label="Desktop"><Monitor /></ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile"><Smartphone /></ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex justify-center bg-muted/40 p-4 sm:p-6">
              <div className={cn("relative h-[520px] w-full overflow-hidden rounded-xl border bg-background shadow-sm transition-[max-width] duration-200", device === "mobile" ? "max-w-[320px]" : "max-w-full")}>
                <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2">
                  <i className="size-2.5 rounded-full bg-red-400/70" /><i className="size-2.5 rounded-full bg-amber-400/70" /><i className="size-2.5 rounded-full bg-green-400/70" />
                  <span className="ml-3 truncate rounded bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">https://{domains[0] ?? "your-site.com"}</span>
                </div>
                <div className="space-y-3 p-5" aria-hidden>
                  <div className="h-5 w-1/3 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted/70" /><div className="h-3 w-5/6 rounded bg-muted/70" /><div className="h-24 w-full rounded bg-muted/50" /><div className="h-3 w-2/3 rounded bg-muted/70" />
                </div>

                <div className={cn("absolute bottom-4 flex flex-col gap-3", position === "right" ? "right-4 items-end" : "left-4 items-start")}>
                  {open && (
                    <div className={cn("flex h-[340px] flex-col overflow-hidden rounded-2xl border bg-background shadow-xl", device === "mobile" ? "w-[288px]" : "w-[320px]")}>
                      <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: color }}>
                        <span className="flex size-7 items-center justify-center rounded-full bg-white/20"><BotIcon className="size-4" /></span>
                        <span className="flex-1 truncate text-sm font-semibold">{title || "Chat"}</span>
                        <button type="button" aria-label="Close preview chat" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/15"><X className="size-4" /></button>
                      </div>
                      <div className="flex-1 space-y-2 overflow-hidden p-3 text-sm">
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">{welcome || "Hi!"}</div>
                        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-white" style={{ backgroundColor: color }}>What is your return policy?</div>
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">Returns are accepted within 30 days [1].</div>
                      </div>
                      <div className="flex items-center gap-2 border-t p-2">
                        <span className="flex-1 rounded-md bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">Type a message…</span>
                        <span className="flex size-7 items-center justify-center rounded-md text-white" style={{ backgroundColor: color }}><Send className="size-3.5" /></span>
                      </div>
                      {powered && <p className="pb-1.5 text-center text-[10px] text-muted-foreground">Powered by KnowledgeDesk</p>}
                    </div>
                  )}
                  <button type="button" aria-label={open ? "Close chat" : "Open chat"} onClick={() => setOpen((o) => !o)}
                    className="flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: color }}>
                    {open ? <X /> : <Launcher />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <div className="space-y-1.5"><CardTitle>Embed code</CardTitle><CardDescription>Paste before the closing &lt;/body&gt; tag.</CardDescription></div>
              <CopyButton value={snippet} />
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed"><code>{snippet}</code></pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
