"use client";

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Reusable, fully controlled date picker: a week strip with prev/next paging,
 * a Today jump, and a popover month calendar. It knows nothing about tasks or
 * stores — wire it up through `value` / `onChange`.
 */
interface DateSelectorProps {
  /** Selected date as YYYY-MM-DD. */
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

const toKey = (date: Date) => format(date, "yyyy-MM-dd");

function safeParse(value: string): Date {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

export function DateSelector({ value, onChange, className }: DateSelectorProps) {
  const selected = safeParse(value);

  // Week on display; realigns when the value changes from outside
  // (render-time derived-state reset — no effect needed).
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selected, { weekStartsOn: 1 }));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setWeekStart(startOfWeek(selected, { weekStartsOn: 1 }));
  }

  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => setWeekStart(addDays(weekStart, -7))}
        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex gap-1" role="group" aria-label="Select a day">
        {weekDays.map((day) => {
          const active = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(toKey(day))}
              aria-pressed={active}
              className={cn(
                "flex w-11 cursor-pointer flex-col items-center rounded-md border py-1.5 transition-colors",
                active
                  ? "border-accent-strong bg-accent-soft text-accent"
                  : "border-transparent text-muted hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <span className="text-[10px] tracking-widest uppercase">{format(day, "EEE")}</span>
              <span className="text-sm font-semibold">{format(day, "d")}</span>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 size-1 rounded-full",
                  isToday(day) ? "bg-accent" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next week"
        onClick={() => setWeekStart(addDays(weekStart, 7))}
        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="ml-1 flex items-center gap-1.5 border-l border-border pl-3">
        <button
          type="button"
          onClick={() => onChange(toKey(new Date()))}
          className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          Today
        </button>
        <MonthPopover selected={selected} onSelect={(day) => onChange(toKey(day))} />
      </div>
    </div>
  );
}

function MonthPopover({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (day: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open) setViewMonth(startOfMonth(selected));
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const onEvent = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onEvent);
    document.addEventListener("keydown", onEvent);
    return () => {
      document.removeEventListener("mousedown", onEvent);
      document.removeEventListener("keydown", onEvent);
    };
  }, [open]);

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const cells = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Open month calendar"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "cursor-pointer rounded-md p-1.5 transition-colors",
          open
            ? "bg-accent-soft text-accent"
            : "text-muted hover:bg-surface-raised hover:text-foreground",
        )}
      >
        <CalendarDays className="size-4" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 w-64 rounded-lg border border-border bg-surface-overlay p-3 shadow-xl shadow-black/40">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-medium">{format(viewMonth, "MMMM yyyy")}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
              <span key={label} className="py-1 text-[10px] font-medium text-faint">
                {label}
              </span>
            ))}
            {cells.map((day) => {
              const active = isSameDay(day, selected);
              const inMonth = isSameMonth(day, viewMonth);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelect(day);
                    setOpen(false);
                  }}
                  className={cn(
                    "cursor-pointer rounded-md py-1 text-xs transition-colors",
                    active
                      ? "bg-accent-strong font-semibold text-background"
                      : inMonth
                        ? "text-foreground hover:bg-surface-raised"
                        : "text-faint hover:bg-surface-raised",
                    !active && isToday(day) && "text-accent",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
