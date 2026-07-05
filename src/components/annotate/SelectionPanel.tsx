"use client";

import { Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { formatArea } from "@/lib/geometry";
import { useAnnotations, useDeleteAnnotation, useUpdateAnnotation } from "@/lib/hooks/useAnnotations";
import { PRESET_COLORS, useAnnotateStore } from "@/lib/stores/annotateStore";
import type { ImageItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Editor for the currently selected polygon: label, color, area, visibility. */
export function SelectionPanel({ image }: { image: ImageItem | null }) {
  const selectedId = useAnnotateStore((state) => state.selectedAnnotationId);
  const hiddenIds = useAnnotateStore((state) => state.hiddenIds);
  const toggleHidden = useAnnotateStore((state) => state.toggleHidden);
  const setSelected = useAnnotateStore((state) => state.setSelected);

  const { data: annotations } = useAnnotations(image?.id ?? null);
  const updateAnnotation = useUpdateAnnotation(image?.id ?? null);
  const deleteAnnotation = useDeleteAnnotation(image?.id ?? null);

  const selected = annotations?.find((annotation) => annotation.id === selectedId);
  if (!image || !selected || selected.id < 0) return null;

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface-raised/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-accent">Selection</p>
        <p className="font-mono text-[10px] text-faint">
          {formatArea(selected.points, image.width, image.height)}
        </p>
      </div>

      <LabelEditor
        key={selected.id}
        initial={selected.label}
        onSave={(label) => updateAnnotation.mutate({ id: selected.id, input: { label } })}
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Recolor to ${preset}`}
              onClick={() => updateAnnotation.mutate({ id: selected.id, input: { color: preset } })}
              style={{ backgroundColor: preset }}
              className={cn(
                "size-5 cursor-pointer rounded-full transition-transform hover:scale-110",
                selected.color === preset &&
                  "ring-2 ring-foreground ring-offset-1 ring-offset-surface",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={hiddenIds.includes(selected.id) ? "Show polygon" : "Hide polygon"}
            onClick={() => toggleHidden(selected.id)}
            className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            {hiddenIds.includes(selected.id) ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Delete selected polygon"
            onClick={() => {
              deleteAnnotation.mutate(selected.id);
              setSelected(null);
            }}
            className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LabelEditor({ initial, onSave }: { initial: string; onSave: (label: string) => void }) {
  const [value, setValue] = useState(initial);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed !== initial) onSave(trimmed);
  };

  return (
    <div className="relative">
      <input
        value={value}
        maxLength={100}
        placeholder="Add a label…"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            (event.target as HTMLInputElement).blur();
          }
          event.stopPropagation(); // keep viewer shortcuts out of the input
        }}
        className="h-8 w-full rounded-md border border-border bg-surface px-2.5 pr-8 text-xs text-foreground placeholder:text-faint focus:border-accent-strong focus:ring-2 focus:ring-accent/25 focus:outline-none"
      />
      {value.trim() !== initial && (
        <Check className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-accent" />
      )}
    </div>
  );
}
