"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { AnnotationList } from "@/components/annotate/AnnotationList";
import { Filmstrip } from "@/components/annotate/Filmstrip";
import { SelectionPanel } from "@/components/annotate/SelectionPanel";
import { Toolbar } from "@/components/annotate/Toolbar";
import { UploadZone } from "@/components/annotate/UploadZone";
import { Button, Spinner } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import {
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
  useUpdateAnnotation,
} from "@/lib/hooks/useAnnotations";
import { useDeleteImage, useImages, useImageUploads } from "@/lib/hooks/useImages";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import type { Annotation, ImageItem, NormalizedPoint, ShapeType } from "@/lib/types";

// Konva touches `window` at import time — it must never run on the server.
const CanvasStage = dynamic(() => import("@/components/annotate/CanvasStage"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <Spinner className="size-6 text-accent" />
    </div>
  ),
});

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function AnnotateView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: images, isPending, isError, refetch, isRefetching } = useImages();
  const { uploads, handleFiles } = useImageUploads();

  const activeImageId = useAnnotateStore((state) => state.activeImageId);
  const setActiveImage = useAnnotateStore((state) => state.setActiveImage);

  // Track by id with graceful fallback: deleted/unknown id → first image.
  const activeImage: ImageItem | null =
    images?.find((image) => image.id === activeImageId) ?? images?.[0] ?? null;
  const activeIndex = activeImage && images ? images.indexOf(activeImage) : -1;
  const nextImage = images && activeIndex >= 0 ? (images[activeIndex + 1] ?? null) : null;

  const { data: annotations } = useAnnotations(activeImage?.id ?? null);
  const createAnnotation = useCreateAnnotation(activeImage?.id ?? null);
  const updateAnnotation = useUpdateAnnotation(activeImage?.id ?? null);
  const deleteAnnotation = useDeleteAnnotation(activeImage?.id ?? null);
  const deleteImage = useDeleteImage();

  const [deletingImage, setDeletingImage] = useState<ImageItem | null>(null);

  const navigate = (delta: number) => {
    if (!images || images.length === 0) return;
    if (useAnnotateStore.getState().draftPoints.length > 0) return;
    const next = images[activeIndex + delta];
    if (next) setActiveImage(next.id);
  };

  const handleCreateShape = (points: NormalizedPoint[], shapeType: ShapeType) => {
    const { color, label } = useAnnotateStore.getState();
    createAnnotation.mutate({ points, shape_type: shapeType, color, label: label || undefined });
  };

  const handleUpdateShape = (id: number, points: NormalizedPoint[]) => {
    if (id > 0) updateAnnotation.mutate({ id, input: { points } });
  };

  /** Ctrl+D — same shape nudged 2% down-right, clamped into the image. */
  const duplicateShape = (annotation: Annotation) => {
    createAnnotation.mutate({
      shape_type: annotation.shape_type,
      label: annotation.label,
      color: annotation.color,
      points: annotation.points.map(([x, y]) => [clamp01(x + 0.02), clamp01(y + 0.02)]),
    });
  };

  /** CVAT-style propagate: normalized coords port to any image size. */
  const copyToNext = async (annotation: Annotation) => {
    if (!nextImage) return;
    try {
      const created = await api.annotations.create(nextImage.id, {
        shape_type: annotation.shape_type,
        label: annotation.label,
        color: annotation.color,
        points: annotation.points,
      });
      useHistoryStore.getState().record(nextImage.id, {
        op: "create",
        id: created.id,
        snapshot: {
          shape_type: created.shape_type,
          label: created.label,
          color: created.color,
          points: created.points,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["annotations", nextImage.id] });
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Copied to next image", variant: "success" });
    } catch {
      toast({ title: "Couldn't copy the shape", variant: "error" });
    }
  };

  // ---- undo / redo -----------------------------------------------------------
  // Entries replay through the same mutations; the `restoring` flag stops the
  // replay itself from being recorded as a new operation.
  const undo = async () => {
    const imageId = activeImage?.id;
    if (!imageId) return;
    const history = useHistoryStore.getState();
    const entry = history.popUndo(imageId);
    if (!entry) return;
    history.setRestoring(true);
    try {
      if (entry.op === "create") {
        if (entry.id > 0) await deleteAnnotation.mutateAsync(entry.id);
        history.pushRedoRaw(imageId, entry);
      } else if (entry.op === "delete") {
        const created = await createAnnotation.mutateAsync(entry.snapshot);
        entry.id = created.id; // future redo/undo targets the new row
        history.pushRedoRaw(imageId, entry);
      } else {
        await updateAnnotation.mutateAsync({ id: entry.id, input: entry.before });
        history.pushRedoRaw(imageId, entry);
      }
    } catch {
      toast({ title: "Nothing to undo anymore", variant: "info" });
    } finally {
      useHistoryStore.getState().setRestoring(false);
    }
  };

  const redo = async () => {
    const imageId = activeImage?.id;
    if (!imageId) return;
    const history = useHistoryStore.getState();
    const entry = history.popRedo(imageId);
    if (!entry) return;
    history.setRestoring(true);
    try {
      if (entry.op === "create") {
        const created = await createAnnotation.mutateAsync(entry.snapshot);
        entry.id = created.id;
        history.pushUndoRaw(imageId, entry);
      } else if (entry.op === "delete") {
        if (entry.id > 0) await deleteAnnotation.mutateAsync(entry.id);
        history.pushUndoRaw(imageId, entry);
      } else {
        await updateAnnotation.mutateAsync({ id: entry.id, input: entry.after });
        history.pushUndoRaw(imageId, entry);
      }
    } catch {
      toast({ title: "Nothing to redo anymore", variant: "info" });
    } finally {
      useHistoryStore.getState().setRestoring(false);
    }
  };

  // ---- global viewer shortcuts (inputs keep their normal editing behavior) ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      const store = useAnnotateStore.getState();

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) void redo();
          else void undo();
        } else if (key === "y") {
          event.preventDefault();
          void redo();
        } else if (key === "d") {
          event.preventDefault();
          const selected = annotations?.find((a) => a.id === store.selectedAnnotationId);
          if (selected && selected.id > 0) duplicateShape(selected);
        }
        return;
      }

      switch (event.key) {
        case "Escape":
          if (store.draftPoints.length > 0) store.clearDraft();
          else store.setSelected(null);
          break;
        case "Enter":
          if (
            (store.tool === "polygon" && store.draftPoints.length >= 3) ||
            (store.tool === "polyline" && store.draftPoints.length >= 2)
          ) {
            handleCreateShape(store.draftPoints, store.tool);
            store.clearDraft();
          }
          break;
        case "Backspace":
          if (store.tool !== "select" && store.draftPoints.length > 0) {
            event.preventDefault();
            store.popDraftPoint();
            break;
          }
        // falls through to delete-selection behavior
        case "Delete":
          if (store.selectedAnnotationId !== null && store.selectedAnnotationId > 0) {
            event.preventDefault();
            deleteAnnotation.mutate(store.selectedAnnotationId);
            store.setSelected(null);
          }
          break;
        case "ArrowLeft":
          navigate(-1);
          break;
        case "ArrowRight":
          navigate(1);
          break;
        case "v":
        case "s":
          store.setTool("select");
          break;
        case "p":
        case "d":
          store.setTool("polygon");
          break;
        case "r":
          store.setTool("rectangle");
          break;
        case "l":
          store.setTool("polyline");
          break;
        case "o":
          store.setTool("point");
          break;
        case "h":
          store.toggleAnnotationsVisible();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, activeIndex, activeImage?.id, annotations]);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-6 text-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">Couldn&apos;t load your image library.</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted">
          The server may be waking up or unreachable.
        </p>
        <Button variant="outline" onClick={() => refetch()} loading={isRefetching}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <UploadZone onFiles={handleFiles} variant="hero" />
        {uploads.length > 0 && (
          <div className="flex w-full max-w-md flex-col gap-2">
            {uploads.map((upload) => (
              <div key={upload.key} className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 truncate text-xs text-muted">{upload.name}</p>
                {upload.error ? (
                  <p className="text-xs text-danger">{upload.error}</p>
                ) : (
                  <div className="h-1 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-150"
                      style={{ width: `${Math.round(upload.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Filmstrip
        images={images}
        activeId={activeImage?.id ?? null}
        uploads={uploads}
        onSelect={setActiveImage}
        onFiles={handleFiles}
        onDeleteImage={setDeletingImage}
      />

      <div className="flex min-h-[55dvh] min-w-0 flex-1 flex-col lg:min-h-0">
        {activeImage && (
          <CanvasStage
            key={activeImage.id}
            image={activeImage}
            annotations={annotations ?? []}
            index={activeIndex}
            total={images.length}
            onNavigate={navigate}
            onCreateShape={handleCreateShape}
            onUpdateShape={handleUpdateShape}
          />
        )}
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-border bg-surface lg:w-64 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <Toolbar />
        <SelectionPanel
          image={activeImage}
          hasNext={nextImage !== null}
          onDuplicate={duplicateShape}
          onCopyToNext={copyToNext}
        />
        <AnnotationList image={activeImage} />
      </aside>

      <ConfirmDialog
        open={deletingImage !== null}
        title="Delete image"
        description={
          deletingImage
            ? `"${deletingImage.original_name}" and its ${deletingImage.annotation_count} annotation${deletingImage.annotation_count === 1 ? "" : "s"} will be permanently removed.`
            : ""
        }
        onConfirm={() => {
          if (deletingImage) deleteImage.mutate(deletingImage.id);
          setDeletingImage(null);
        }}
        onClose={() => setDeletingImage(null)}
      />
    </div>
  );
}
