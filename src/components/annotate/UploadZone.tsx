"use client";

import { ImagePlus, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  /** "hero" for the empty-library state, "compact" for the filmstrip. */
  variant?: "compact" | "hero";
}

export function UploadZone({ onFiles, variant = "compact" }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = ""; // allow re-selecting the same file
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors",
        dragging
          ? "border-accent bg-accent-soft text-accent"
          : "border-border-strong text-muted hover:border-accent hover:text-accent",
        variant === "hero" ? "max-w-md p-10" : "p-4",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={handleBrowse}
      />
      {variant === "hero" ? (
        <>
          <UploadCloud className="size-10" />
          <p className="text-sm font-medium text-foreground">Upload your first images</p>
          <p className="text-xs leading-relaxed">
            Drag &amp; drop or click to browse.
            <br />
            JPEG, PNG, or WebP — up to 10 MB each.
          </p>
        </>
      ) : (
        <>
          <ImagePlus className="size-5" />
          <p className="text-[11px] font-medium">Add images</p>
        </>
      )}
    </button>
  );
}
