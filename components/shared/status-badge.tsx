import { CheckCircle2, CircleDashed, Loader2, PauseCircle, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "ready" | "processing" | "pending" | "failed" | "active" | "paused" | "draft";

const config: Record<Status, { label: string; icon: LucideIcon; className: string; spin?: boolean }> = {
  ready: { label: "Ready", icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
  active: { label: "Active", icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
  processing: { label: "Processing", icon: Loader2, spin: true, className: "border-warning/30 bg-warning/10 text-warning" },
  pending: { label: "Pending", icon: CircleDashed, className: "border-warning/30 bg-warning/10 text-warning" },
  failed: { label: "Failed", icon: XCircle, className: "border-destructive/30 bg-destructive/10 text-destructive" },
  paused: { label: "Paused", icon: PauseCircle, className: "border-border bg-muted text-muted-foreground" },
  draft: { label: "Draft", icon: CircleDashed, className: "border-border bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { label, icon: Icon, className: tone, spin } = config[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", tone, className)}>
      <Icon className={cn("size-3", spin && "animate-spin")} aria-hidden />
      {label}
    </Badge>
  );
}
