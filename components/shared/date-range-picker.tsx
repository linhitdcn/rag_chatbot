"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type RangePreset = "7" | "30" | "90" | "custom";

interface Props {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  custom?: DateRange;
  onCustomChange: (r: DateRange | undefined) => void;
}

const fmt = (d?: Date) => d?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "…";

export function DateRangePicker({ preset, onPresetChange, custom, onCustomChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as RangePreset)}>
        <SelectTrigger className="w-36" aria-label="Date range"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-normal">
              <CalendarIcon /> {fmt(custom?.from)} – {fmt(custom?.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" numberOfMonths={2} selected={custom} onSelect={onCustomChange} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
