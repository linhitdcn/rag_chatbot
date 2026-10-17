"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { setSpendLimit } from "@/lib/actions/workspace";
import { estimateCostUsd } from "@/lib/pricing";

const config = { tokens: { label: "Tokens", color: "var(--chart-1)" } } satisfies ChartConfig;
export function UsageView({ byDay, monthTokens, initialLimit, canEdit }: { byDay: { label: string; tokens: number }[]; monthTokens: number; initialLimit: number; canEdit: boolean }) {
  const spent = estimateCostUsd(monthTokens);
  const [limit, setLimit] = React.useState(String(initialLimit));
  const [saving, setSaving] = React.useState(false);
  const total = byDay.reduce((s, d) => s + d.tokens, 0);
  const pct = Math.min(100, (spent / (Number(limit) || 1)) * 100);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return void toast.error("Enter a spend limit greater than 0");
    setSaving(true);
    const res = await setSpendLimit(n);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Monthly limit set to $${n.toFixed(2)}`);
  }

  return (
    <>
      <PageHeader title="Usage & Limits" description="Track token consumption and cap your monthly spend." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none"><CardHeader><CardDescription>Tokens (30 days)</CardDescription><CardTitle className="text-2xl tabular-nums">{total.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card className="shadow-none"><CardHeader><CardDescription>Estimated cost (month, approx.)</CardDescription><CardTitle className="text-2xl tabular-nums">${spent.toFixed(2)}</CardTitle></CardHeader></Card>
        <Card className="shadow-none">
          <CardHeader><CardDescription>Of monthly limit</CardDescription><CardTitle className="text-2xl tabular-nums">{pct.toFixed(0)}%</CardTitle></CardHeader>
          <CardContent><Progress value={pct} className="h-1.5" /></CardContent>
        </Card>
      </div>
      <Card className="shadow-none">
        <CardHeader><CardTitle>Daily token usage</CardTitle><CardDescription>Prompt + completion tokens across all bots</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={byDay}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tokens" fill="var(--color-tokens)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="max-w-xl shadow-none">
        <form onSubmit={save}>
          <CardHeader><CardTitle>Monthly spend limit</CardTitle><CardDescription>When reached, your bots pause and show visitors a friendly message.</CardDescription></CardHeader>
          <CardContent className="mt-4 flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="limit">Limit (USD)</Label>
              <div className="relative"><span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input id="limit" inputMode="decimal" disabled={!canEdit} className="w-36 pl-6" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={saving || !canEdit}>{saving && <Loader2 className="animate-spin" />} Save limit</Button>
          </CardContent>
        </form>
      </Card>
    </>
  );
}
