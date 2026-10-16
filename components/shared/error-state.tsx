"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message = "Something went wrong while loading this page.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
      <AlertTriangle className="mb-3 size-6 text-destructive" aria-hidden />
      <h3 className="text-sm font-semibold">Couldn&apos;t load data</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
