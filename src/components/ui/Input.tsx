"use client";

import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium tracking-wide text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10 rounded-md border bg-surface px-3 text-sm text-foreground",
          "placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-offset-0",
          error
            ? "border-danger focus:ring-danger/40"
            : "border-border focus:border-accent-strong focus:ring-accent/25",
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
