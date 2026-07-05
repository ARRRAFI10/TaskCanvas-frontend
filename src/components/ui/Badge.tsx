import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const tones = {
  default: "bg-surface-raised text-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success/10 text-success border-transparent",
  warning: "bg-warning/10 text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
} as const;

interface BadgeProps extends ComponentProps<"span"> {
  tone?: keyof typeof tones;
}

export function Badge({ tone = "default", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
