"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, MessageSquare, Plus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker, type RangePreset } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/layout/page-header";
import type { DashboardInput } from "@/lib/data/analytics";
import { estimateCostUsd } from "@/lib/pricing";
import type { Conversation, UnansweredQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { RecentConversations } from "@/components/dashboard/recent-conversations";

const areaConfig = { conversations: { label: "Conversations", color: "var(--chart-1)" } } satisfies ChartConfig;
const barConfig = { messages: { label: "Messages", color: "var(--chart-2)" } } satisfies ChartConfig;

const DAY = 86_400_000;
const pct = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : 100) : Math.round(((cur - prev) / prev) * 1000) / 10);

export function DashboardView({ input, bots, unanswered, setup }: {
  input: DashboardInput; bots: { id: string; name: string }[]; unanswered: UnansweredQuestion[]; setup: { bot: boolean; source: boolean };
}) {
  const [preset, setPreset] = React.useState<RangePreset>("30");
  const [custom, setCustom] = React.useState<DateRange | undefined>();
  const [botId, setBotId] = React.useState("all");

  const now = React.useMemo(() => new Date(input.now).getTime(), [input.now]);
  const days = preset === "custom"
    ? Math.max(2, custom?.from && custom?.to ? Math.round((+custom.to - +custom.from) / DAY) + 1 : 30)
    : Number(preset);
  const botName = (id: string) => bots.find((b) => b.id === id)?.name ?? "Unknown bot";

  const view = React.useMemo(() => {
    const inBot = (b: string) => botId === "all" || b === botId;
    // Whole UTC days: the window ends at the end of today (or of the custom range's last day).
    const end = preset === "custom" && custom?.to ? Math.floor(custom.to.getTime() / DAY) * DAY + DAY : Math.floor(now / DAY) * DAY + DAY;
    const start = end - days * DAY;
    const prevStart = start - days * DAY;
    const within = (iso: string, from: number, to: number) => { const t = new Date(iso).getTime(); return t >= from && t < to; };

    const convs = input.conversations.filter((c) => inBot(c.botId));
    const cur = convs.filter((c) => within(c.startedAt, start, end));
    const prev = convs.filter((c) => within(c.startedAt, prevStart, start));
    const leadsIn = (from: number, to: number) => input.leads.filter((l) => inBot(l.botId) && within(l.capturedAt, from, to)).length;
    const tokensIn = (from: number, to: number) => input.tokens.filter((t) => inBot(t.botId) && within(t.at, from, to)).reduce((s, t) => s + t.tokens, 0);
    const msgs = (rows: Conversation[]) => rows.reduce((s, c) => s + c.messageCount, 0);
    const answerRate = (rows: Conversation[]) => (rows.length ? ((rows.length - rows.filter((c) => c.unanswered).length) / rows.length) * 100 : 100);

    const kpis = [
      { key: "conversations", label: "Conversations", value: cur.length.toLocaleString(), delta: pct(cur.length, prev.length) },
      { key: "messages", label: "Messages", value: msgs(cur).toLocaleString(), delta: pct(msgs(cur), msgs(prev)) },
      { key: "answerRate", label: "Answer rate", value: `${answerRate(cur).toFixed(1)}%`, delta: Math.round((answerRate(cur) - answerRate(prev)) * 10) / 10 },
      { key: "leads", label: "Leads captured", value: leadsIn(start, end).toLocaleString(), delta: pct(leadsIn(start, end), leadsIn(prevStart, start)) },
      { key: "cost", label: "Est. token cost", value: `$${estimateCostUsd(tokensIn(start, end)).toFixed(2)}`, delta: pct(tokensIn(start, end), tokensIn(prevStart, start)) },
    ];

    const perDay = new Map<string, number>();
    for (const c of cur) perDay.set(c.startedAt.slice(0, 10), (perDay.get(c.startedAt.slice(0, 10)) ?? 0) + 1);
    const series = Array.from({ length: days }, (_, i) => {
      const d = new Date(start + i * DAY);
      const date = d.toISOString().slice(0, 10);
      return { date, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), conversations: perDay.get(date) ?? 0 };
    });

    const byBot = new Map<string, number>();
    for (const c of input.conversations.filter((c) => within(c.startedAt, start, end))) byBot.set(c.botId, (byBot.get(c.botId) ?? 0) + c.messageCount);
    const barData = bots.filter((b) => inBot(b.id)).map((b) => ({ bot: b.name, messages: byBot.get(b.id) ?? 0 }));

    // "Top questions" = the most common opening messages in the period.
    const asked = new Map<string, number>();
    for (const c of cur) { const q = c.preview.trim(); if (q) asked.set(q, (asked.get(q) ?? 0) + 1); }
    const topQuestions = [...asked].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([question, count]) => ({ question, count }));

    return { kpis, series, barData, topQuestions, recent: cur.slice(0, 5) };
  }, [input, bots, botId, preset, custom, days, now]);

  const open = unanswered.filter((u) => u.status === "open" && (botId === "all" || u.botId === botId)).slice(0, 4);
  const { kpis, series, barData, topQuestions, recent } = view;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How your chatbots are performing across all channels."
        actions={
          <>
            <Select value={botId} onValueChange={setBotId}>
              <SelectTrigger className="w-44" aria-label="Filter by bot"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bots</SelectItem>
                {bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
          </>
        }
      />

      <OnboardingChecklist setup={setup} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => {
          const up = k.delta >= 0;
          // Lower cost is good, so invert the color for the cost card.
          const good = k.key === "cost" ? !up : up;
          return (
            <Card key={k.key} className="gap-2 py-4 shadow-none">
              <CardHeader className="px-4"><CardDescription>{k.label}</CardDescription></CardHeader>
              <CardContent className="space-y-1 px-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{k.value}</p>
                <p className={cn("flex items-center gap-1 text-xs", good ? "text-success" : "text-destructive")}>
                  {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(k.delta)}% <span className="text-muted-foreground">vs previous period</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Per day, last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-64 w-full">
              <AreaChart data={series} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="fillConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-conversations)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-conversations)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area dataKey="conversations" type="monotone" stroke="var(--color-conversations)" strokeWidth={2} fill="url(#fillConv)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Messages by bot</CardTitle>
            <CardDescription>Total in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-64 w-full">
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <YAxis dataKey="bot" type="category" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 12 }} />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="messages" fill="var(--color-messages)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Top questions</CardTitle>
            <CardDescription>What visitors ask the most</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {topQuestions.map((q, i) => (
                <li key={q.question} className="flex items-center gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{q.question}</span>
                  <Badge variant="secondary" className="tabular-nums">{q.count}</Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Latest questions your bots couldn&apos;t answer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {open.length === 0 ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Check className="size-4 text-success" /> All caught up.</p>
            ) : open.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50">
                <p className="min-w-0 flex-1 truncate text-sm">{u.question}</p>
                <span className="text-xs text-muted-foreground tabular-nums">×{u.count}</span>
                <Button asChild size="xs" variant="outline"><Link href="/unanswered"><Plus /> Add answer</Link></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Recent conversations</CardTitle>
            <CardDescription>The latest chats across your bots</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/conversations"><MessageSquare /> View all</Link></Button>
        </CardHeader>
        <CardContent><RecentConversations rows={recent} botName={botName} /></CardContent>
      </Card>
    </>
  );
}
