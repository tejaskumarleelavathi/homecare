import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { formatDateStr, fromDateStr, todayStr, toDateStr } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SchedulePopoverProps {
  label: string;
  defaultDate?: string;
  onConfirm: (dateStr: string) => Promise<void>;
  variant?: "default" | "outline";
}

export function SchedulePopover({ label, defaultDate, onConfirm, variant = "default" }: SchedulePopoverProps) {
  const earliest = todayStr();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(
    defaultDate && defaultDate >= earliest ? defaultDate : earliest,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirm(selected);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant={variant}>
          <CalendarClock className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={fromDateStr(selected)}
          onSelect={(date) => date && setSelected(toDateStr(date))}
          disabled={{ before: fromDateStr(earliest) }}
          defaultMonth={fromDateStr(selected)}
        />
        <div className="flex items-center justify-between gap-3 border-t border-border p-3">
          <p className="text-sm text-muted-foreground">{formatDateStr(selected)}</p>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
