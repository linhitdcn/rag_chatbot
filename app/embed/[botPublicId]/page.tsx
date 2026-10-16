import { notFound } from "next/navigation";
import { bots } from "@/lib/mock/data";

// Phase 5 builds the real widget UI here. This placeholder keeps the route reserved.
export default async function EmbedPage({ params }: { params: Promise<{ botPublicId: string }> }) {
  const { botPublicId } = await params;
  const bot = bots.find((b) => b.publicId === botPublicId);
  if (!bot) notFound();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Widget for “{bot.name}” arrives in Phase 5.
    </div>
  );
}
