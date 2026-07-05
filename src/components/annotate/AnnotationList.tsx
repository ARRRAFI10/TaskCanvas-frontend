"use client";

import { Trash2 } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { useAnnotations, useDeleteAnnotation } from "@/lib/hooks/useAnnotations";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import { cn } from "@/lib/utils";

export function AnnotationList({ imageId }: { imageId: number | null }) {
  const { data: annotations, isPending } = useAnnotations(imageId);
  const deleteAnnotation = useDeleteAnnotation(imageId);
  const selectedId = useAnnotateStore((state) => state.selectedAnnotationId);
  const setSelected = useAnnotateStore((state) => state.setSelected);
  const setMode = useAnnotateStore((state) => state.setMode);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted">
        Annotations
        {annotations && annotations.length > 0 && (
          <span className="ml-1.5 text-faint">({annotations.length})</span>
        )}
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {imageId === null || (isPending && imageId !== null) ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : annotations && annotations.length > 0 ? (
          annotations.map((annotation, index) => {
            const selected = annotation.id === selectedId;
            return (
              <div
                key={annotation.id}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
                  selected
                    ? "border-accent-strong bg-accent-soft"
                    : "border-transparent hover:bg-surface-raised",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode("select");
                    setSelected(annotation.id);
                  }}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: annotation.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {annotation.label || `Polygon ${index + 1}`}
                    </span>
                    <span className="text-[10px] text-faint">
                      {annotation.points.length} vertices
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${annotation.label || `polygon ${index + 1}`}`}
                  disabled={annotation.id < 0}
                  onClick={() => deleteAnnotation.mutate(annotation.id)}
                  className="cursor-pointer rounded p-1 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 disabled:pointer-events-none"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-[11px] leading-relaxed text-faint">
            No polygons on this image yet. Press <span className="font-mono">d</span> and start
            clicking on the image to outline a region.
          </p>
        )}
      </div>
    </div>
  );
}
