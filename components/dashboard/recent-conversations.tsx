import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBot } from "@/lib/mock/data";
import { formatRelative } from "@/lib/format";
import type { Conversation } from "@/lib/types";

export function RecentConversations({ rows }: { rows: Conversation[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Visitor</TableHead><TableHead>Bot</TableHead><TableHead>First message</TableHead>
            <TableHead className="text-right">Msgs</TableHead><TableHead>Rating</TableHead><TableHead className="text-right">Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium"><Link className="hover:underline" href={`/conversations/${c.id}`}>{c.visitor}</Link></TableCell>
              <TableCell className="text-muted-foreground">{getBot(c.botId)?.name}</TableCell>
              <TableCell className="max-w-64 truncate">{c.preview}</TableCell>
              <TableCell className="text-right tabular-nums">{c.messageCount}</TableCell>
              <TableCell>
                {c.rating === "up" ? <ThumbsUp aria-label="Positive" className="size-4 text-success" />
                  : c.rating === "down" ? <ThumbsDown aria-label="Negative" className="size-4 text-destructive" />
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{formatRelative(c.startedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
