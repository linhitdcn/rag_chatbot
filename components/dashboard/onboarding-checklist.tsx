"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const steps = [
  { label: "Create your workspace", href: "/settings/general", done: true },
  { label: "Create your first bot", href: "/bots/new", done: true },
  { label: "Upload your first document", href: "/knowledge", done: true },
  { label: "Copy the embed code", href: "/widget", done: false },
];

export function OnboardingChecklist() {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <Card className="border-primary/30 bg-primary/5 shadow-none">
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Finish setting up · {done}/{steps.length}</CardTitle>
        <CardDescription>Complete these steps to go live with your first chatbot.</CardDescription>
        <Progress value={(done / steps.length) * 100} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((s) => (
            <li key={s.label}>
              <Button asChild variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-left font-normal">
                <Link href={s.href}>
                  {s.done ? <Check className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                  <span className={s.done ? "text-muted-foreground line-through" : "font-medium"}>{s.label}</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
