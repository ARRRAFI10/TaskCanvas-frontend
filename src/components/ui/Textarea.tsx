"use client";

import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface TextareaProps extends ComponentProps<"textarea"> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...rest }: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium tracking-wide text-muted">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-20 resize-y rounded-md border bg-surface px-3 py-2 text-sm text-foreground",
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
