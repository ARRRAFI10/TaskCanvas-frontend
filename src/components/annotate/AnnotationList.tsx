"use client";

import { Download, Eye, EyeOff, Trash2 } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { shapeMetric } from "@/lib/geometry";
import { useAnnotations, useDeleteAnnotation } from "@/lib/hooks/useAnnotations";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import type { ImageItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AnnotationList({ image }: { image: ImageItem | null }) {
  const imageId = image?.id ?? null;
  const { data: annotations, isPending } = useAnnotations(imageId);
  const deleteAnnotation = useDeleteAnnotation(imageId);

  const selectedId = useAnnotateStore((state) => state.selectedAnnotationId);
  const showAnnotations = useAnnotateStore((state) => state.showAnnotations);
  const hiddenIds = useAnnotateStore((state) => state.hiddenIds);
  const setSelected = useAnnotateStore((state) => state.setSelected);
  const setTool = useAnnotateStore((state) => state.setTool);
  const toggleHidden = useAnnotateStore((state) => state.toggleHidden);
  const toggleAllVisible = useAnnotateStore((state) => state.toggleAnnotationsVisible);

  const exportJson = () => {
    if (!image || !annotations) return;
    const payload = {
      image: { name: image.original_name, width: image.width, height: image.height },
      exported_at: new Date().toISOString(),
      annotations: annotations
        .filter((annotation) => annotation.id > 0)
        .map(({ shape_type, label, color, points }) => ({ shape_type, label, color, points })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${image.original_name.replace(/\.[^.]+$/, "")}-annotations.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted">
          Annotations
          {annotations && annotations.length > 0 && (
            <span className="ml-1.5 text-faint">({annotations.length})</span>
          )}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={showAnnotations ? "Hide all overlays" : "Show all overlays"}
            title={showAnnotations ? "Hide all overlays (h)" : "Show all overlays (h)"}
            onClick={toggleAllVisible}
            className={cn(
              "cursor-pointer rounded p-1 transition-colors hover:bg-surface-raised",
              showAnnotations ? "text-muted hover:text-foreground" : "text-warning",
            )}
          >
            {showAnnotations ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Export annotations as JSON"
            title="Export annotations as JSON"
            disabled={!annotations || annotations.length === 0}
            onClick={exportJson}
            className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {imageId === null || isPending ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : annotations && annotations.length > 0 ? (
          annotations.map((annotation, index) => {
            const selected = annotation.id === selectedId;
            const hidden = hiddenIds.includes(annotation.id) || !showAnnotations;
            return (
              <div
                key={annotation.id}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
                  selected
                    ? "border-accent-strong bg-accent-soft"
                    : "border-transparent hover:bg-surface-raised",
                  hidden && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTool("select");
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
                      {annotation.label || `Shape ${index + 1}`}
                    </span>
                    <span className="block truncate text-[10px] text-faint">
                      {annotation.shape_type}
                      {image && ` · ${shapeMetric(annotation, image.width, image.height)}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={hidden ? "Show polygon" : "Hide polygon"}
                  disabled={annotation.id < 0}
                  onClick={() => toggleHidden(annotation.id)}
                  className="cursor-pointer rounded p-1 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-surface hover:text-foreground focus-visible:opacity-100 disabled:pointer-events-none"
                >
                  {hiddenIds.includes(annotation.id) ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
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
            No shapes on this image yet. Pick a tool (<span className="font-mono">p</span> for
            polygon, <span className="font-mono">r</span> for box) and start on the image.
          </p>
        )}
      </div>
    </div>
  );
}
