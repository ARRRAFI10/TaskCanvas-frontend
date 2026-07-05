"use client";

import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface SelectProps extends ComponentProps<"select"> {
  label?: string;
  error?: string;
}

export function Select({ label, error, id, className, children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium tracking-wide text-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-md border bg-surface px-3 text-sm text-foreground",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237f93a8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[right_0.75rem_center] bg-no-repeat pr-9",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          error
            ? "border-danger focus:ring-danger/40"
            : "border-border focus:border-accent-strong focus:ring-accent/25",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
