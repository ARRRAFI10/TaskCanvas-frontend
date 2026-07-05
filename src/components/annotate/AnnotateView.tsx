"use client";

import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { AnnotationList } from "@/components/annotate/AnnotationList";
import { Filmstrip } from "@/components/annotate/Filmstrip";
import { Toolbar } from "@/components/annotate/Toolbar";
import { UploadZone } from "@/components/annotate/UploadZone";
import { Button, Spinner } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAnnotations, useCreateAnnotation, useDeleteAnnotation } from "@/lib/hooks/useAnnotations";
import { useDeleteImage, useImages, useImageUploads } from "@/lib/hooks/useImages";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import type { ImageItem, NormalizedPoint } from "@/lib/types";

// Konva touches `window` at import time — it must never run on the server.
const CanvasStage = dynamic(() => import("@/components/annotate/CanvasStage"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <Spinner className="size-6 text-accent" />
    </div>
  ),
});

export function AnnotateView() {
  const { data: images, isPending, isError, refetch, isRefetching } = useImages();
  const { uploads, handleFiles } = useImageUploads();

  const activeImageId = useAnnotateStore((state) => state.activeImageId);
  const setActiveImage = useAnnotateStore((state) => state.setActiveImage);

  // Track by id with graceful fallback: deleted/unknown id → first image.
  const activeImage: ImageItem | null =
    images?.find((image) => image.id === activeImageId) ?? images?.[0] ?? null;
  const activeIndex = activeImage && images ? images.indexOf(activeImage) : -1;

  const { data: annotations } = useAnnotations(activeImage?.id ?? null);
  const createAnnotation = useCreateAnnotation(activeImage?.id ?? null);
  const deleteAnnotation = useDeleteAnnotation(activeImage?.id ?? null);
  const deleteImage = useDeleteImage();

  const [deletingImage, setDeletingImage] = useState<ImageItem | null>(null);

  const navigate = (delta: number) => {
    if (!images || images.length === 0) return;
    if (useAnnotateStore.getState().draftPoints.length > 0) return;
    const next = images[activeIndex + delta];
    if (next) setActiveImage(next.id);
  };

  const handleCreatePolygon = (points: NormalizedPoint[]) => {
    const { color, label } = useAnnotateStore.getState();
    createAnnotation.mutate({ points, color, label: label || undefined });
  };

  // Global viewer shortcuts; inputs keep their normal editing behavior.
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
      switch (event.key) {
        case "Escape":
          if (store.draftPoints.length > 0) store.clearDraft();
          else store.setSelected(null);
          break;
        case "Backspace":
          if (store.mode === "draw" && store.draftPoints.length > 0) {
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
        case "d":
          store.setMode("draw");
          break;
        case "v":
        case "s":
          store.setMode("select");
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, activeIndex, activeImage?.id]);

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
            onCreatePolygon={handleCreatePolygon}
          />
        )}
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-border bg-surface lg:w-64 lg:border-t-0 lg:border-l">
        <Toolbar />
        <AnnotationList imageId={activeImage?.id ?? null} />
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
