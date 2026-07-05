"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import { useEffect } from "react";

import { UploadZone } from "@/components/annotate/UploadZone";
import type { UploadEntry } from "@/lib/hooks/useImages";
import type { ImageItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilmstripProps {
  images: ImageItem[];
  activeId: number | null;
  uploads: UploadEntry[];
  onSelect: (id: number) => void;
  onFiles: (files: File[]) => void;
  onDeleteImage: (image: ImageItem) => void;
}

export function Filmstrip({
  images,
  activeId,
  uploads,
  onSelect,
  onFiles,
  onDeleteImage,
}: FilmstripProps) {
  // Keep the active thumbnail visible while stack-scrolling.
  useEffect(() => {
    if (activeId === null) return;
    document
      .getElementById(`tc-thumb-${activeId}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <aside
      aria-label="Image series"
      className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-surface p-2 lg:h-auto lg:w-44 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-3"
    >
      <div className="order-last min-w-28 shrink-0 lg:order-first lg:min-w-0">
        <UploadZone onFiles={onFiles} />
      </div>

      {uploads.map((upload) => (
        <div
          key={upload.key}
          className="flex min-w-40 shrink-0 flex-col gap-1.5 rounded-lg border border-border bg-surface-raised p-2.5 lg:min-w-0"
        >
          <p className="truncate text-[11px] text-muted">{upload.name}</p>
          {upload.error ? (
            <p className="flex items-center gap-1 text-[11px] text-danger">
              <AlertCircle className="size-3 shrink-0" />
              {upload.error}
            </p>
          ) : (
            <div className="h-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150"
                style={{ width: `${Math.round(upload.progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}

      {images.map((image, index) => {
        const active = image.id === activeId;
        return (
          <div key={image.id} className="group relative shrink-0">
            <button
              type="button"
              id={`tc-thumb-${image.id}`}
              onClick={() => onSelect(image.id)}
              aria-label={`View image ${index + 1}: ${image.original_name}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "block w-28 cursor-pointer overflow-hidden rounded-lg border transition-all lg:w-full",
                active
                  ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
                  : "border-border opacity-70 hover:opacity-100",
              )}
            >
              {/* Dynamic user uploads from the Django media host — next/image
                  optimization is intentionally skipped here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.file}
                alt={image.original_name}
                loading="lazy"
                className="aspect-[4/3] w-full bg-black/40 object-cover"
              />
              <div className="flex items-center justify-between gap-1 px-2 py-1">
                <span className="truncate text-[10px] text-muted">{image.original_name}</span>
                {image.annotation_count > 0 && (
                  <span className="rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold text-accent">
                    {image.annotation_count}
                  </span>
                )}
              </div>
            </button>
            <button
              type="button"
              aria-label={`Delete ${image.original_name}`}
              onClick={() => onDeleteImage(image)}
              className="absolute top-1 right-1 cursor-pointer rounded-md bg-black/60 p-1 text-muted opacity-0 backdrop-blur transition-all group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
