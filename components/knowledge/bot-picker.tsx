"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** "Use in" checkboxes: which bots may answer from a knowledge source. */
export function BotPicker({ bots, value, onChange, idPrefix = "bp" }: {
  bots: { id: string; name: string }[]; value: string[]; onChange: (ids: string[]) => void; idPrefix?: string;
}) {
  if (bots.length === 0) return <p className="text-xs text-muted-foreground">Create a chatbot first, then link this source to it.</p>;
  const toggle = (id: string, on: boolean) => onChange(on ? [...new Set([...value, id])] : value.filter((x) => x !== id));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Use in chatbots</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {bots.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            <Checkbox id={`${idPrefix}-${b.id}`} checked={value.includes(b.id)} onCheckedChange={(c) => toggle(b.id, !!c)} />
            <Label htmlFor={`${idPrefix}-${b.id}`} className="font-normal">{b.name}</Label>
          </div>
        ))}
      </div>
      {value.length === 0 && <p className="text-xs text-warning">No bot selected — no chatbot will use this until you link it.</p>}
    </fieldset>
  );
}
