"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_TAGS = 8;

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
}

/** Chip-style tag editor: Enter or comma adds, Backspace on empty removes last. */
export function TagInput({ value, onChange, label }: TagInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const tag = draft.trim().replace(/,+$/, "");
    setDraft("");
    if (!tag || value.length >= MAX_TAGS) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium tracking-wide text-muted">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5",
          "focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent/25",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="cursor-pointer rounded-full text-faint transition-colors hover:text-danger"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraft}
          placeholder={value.length === 0 ? "Type a tag, press Enter" : ""}
          className="min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}
