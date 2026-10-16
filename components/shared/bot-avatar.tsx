import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function BotAvatar({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <Avatar className={cn("size-9 rounded-lg", className)}>
      <AvatarFallback className="rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: color }}>
        {name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
