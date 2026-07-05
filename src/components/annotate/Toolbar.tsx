"use client";

import { MousePointer2, Pencil, RotateCcw } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { PRESET_COLORS, useAnnotateStore } from "@/lib/stores/annotateStore";
import { cn } from "@/lib/utils";

export function Toolbar() {
  const mode = useAnnotateStore((state) => state.mode);
  const color = useAnnotateStore((state) => state.color);
  const label = useAnnotateStore((state) => state.label);
  const brightness = useAnnotateStore((state) => state.brightness);
  const contrast = useAnnotateStore((state) => state.contrast);
  const setMode = useAnnotateStore((state) => state.setMode);
  const setColor = useAnnotateStore((state) => state.setColor);
  const setLabel = useAnnotateStore((state) => state.setLabel);
  const setBrightness = useAnnotateStore((state) => state.setBrightness);
  const setContrast = useAnnotateStore((state) => state.setContrast);
  const resetAdjustments = useAnnotateStore((state) => state.resetAdjustments);

  const adjusted = brightness !== 0 || contrast !== 0;

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Tool</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setMode("draw")}
            aria-pressed={mode === "draw"}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
              mode === "draw" ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <Pencil className="size-3.5" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => setMode("select")}
            aria-pressed={mode === "select"}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
              mode === "select" ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
            )}
          >
            <MousePointer2 className="size-3.5" />
            Select
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Color</p>
        <div className="flex gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Use color ${preset}`}
              aria-pressed={color === preset}
              onClick={() => setColor(preset)}
              style={{ backgroundColor: preset }}
              className={cn(
                "size-6 cursor-pointer rounded-full transition-transform hover:scale-110",
                color === preset &&
                  "ring-2 ring-foreground ring-offset-2 ring-offset-surface",
              )}
            />
          ))}
        </div>
      </div>

      <Input
        label="Label for new polygons (optional)"
        placeholder="e.g. nodule, lesion, region…"
        value={label}
        maxLength={100}
        onChange={(event) => setLabel(event.target.value)}
      />

      {/* Window/level — non-destructive display adjustment, persists across the series */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted">Image adjustments</p>
          {adjusted && (
            <button
              type="button"
              onClick={resetAdjustments}
              className="flex cursor-pointer items-center gap-1 text-[11px] text-muted transition-colors hover:text-accent"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[11px] text-faint">
            <span className="w-14 shrink-0">Bright</span>
            <input
              type="range"
              min={-0.6}
              max={0.6}
              step={0.02}
              value={brightness}
              onChange={(event) => setBrightness(parseFloat(event.target.value))}
              className="w-full cursor-pointer [accent-color:var(--accent)]"
              aria-label="Brightness"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-faint">
            <span className="w-14 shrink-0">Contrast</span>
            <input
              type="range"
              min={-60}
              max={60}
              step={2}
              value={contrast}
              onChange={(event) => setContrast(parseFloat(event.target.value))}
              className="w-full cursor-pointer [accent-color:var(--accent)]"
              aria-label="Contrast"
            />
          </label>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-relaxed text-faint">
        <dt className="font-mono">wheel</dt>
        <dd>scroll images</dd>
        <dt className="font-mono">ctrl+wheel</dt>
        <dd>zoom to cursor</dd>
        <dt className="font-mono">← →</dt>
        <dd>previous / next image</dd>
        <dt className="font-mono">d / v</dt>
        <dd>draw / select tool</dd>
        <dt className="font-mono">h</dt>
        <dd>hide / show overlays</dd>
        <dt className="font-mono">esc</dt>
        <dd>cancel polygon</dd>
        <dt className="font-mono">⌫ / del</dt>
        <dd>undo vertex / delete selection</dd>
      </dl>
    </div>
  );
}
