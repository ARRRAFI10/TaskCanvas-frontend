"use client";

import { Hexagon, MapPin, MousePointer2, RotateCcw, Spline, Square } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { PRESET_COLORS, useAnnotateStore } from "@/lib/stores/annotateStore";
import type { AnnotateTool } from "@/lib/stores/annotateStore";
import { cn } from "@/lib/utils";

const TOOLS: Array<{ id: AnnotateTool; icon: typeof Hexagon; label: string; hotkey: string }> = [
  { id: "select", icon: MousePointer2, label: "Select", hotkey: "V" },
  { id: "polygon", icon: Hexagon, label: "Polygon", hotkey: "P" },
  { id: "rectangle", icon: Square, label: "Box", hotkey: "R" },
  { id: "polyline", icon: Spline, label: "Line", hotkey: "L" },
  { id: "point", icon: MapPin, label: "Point", hotkey: "O" },
];

function AdjustmentSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-faint">
      <span className="w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="w-full cursor-pointer [accent-color:var(--accent)]"
        aria-label={label}
      />
    </label>
  );
}

export function Toolbar() {
  const tool = useAnnotateStore((state) => state.tool);
  const color = useAnnotateStore((state) => state.color);
  const label = useAnnotateStore((state) => state.label);
  const brightness = useAnnotateStore((state) => state.brightness);
  const contrast = useAnnotateStore((state) => state.contrast);
  const saturation = useAnnotateStore((state) => state.saturation);
  const invert = useAnnotateStore((state) => state.invert);
  const grayscale = useAnnotateStore((state) => state.grayscale);
  const overlayOpacity = useAnnotateStore((state) => state.overlayOpacity);
  const setTool = useAnnotateStore((state) => state.setTool);
  const setColor = useAnnotateStore((state) => state.setColor);
  const setLabel = useAnnotateStore((state) => state.setLabel);
  const setBrightness = useAnnotateStore((state) => state.setBrightness);
  const setContrast = useAnnotateStore((state) => state.setContrast);
  const setSaturation = useAnnotateStore((state) => state.setSaturation);
  const toggleInvert = useAnnotateStore((state) => state.toggleInvert);
  const toggleGrayscale = useAnnotateStore((state) => state.toggleGrayscale);
  const setOverlayOpacity = useAnnotateStore((state) => state.setOverlayOpacity);
  const resetAdjustments = useAnnotateStore((state) => state.resetAdjustments);

  const adjusted =
    brightness !== 0 || contrast !== 0 || saturation !== 0 || invert || grayscale;

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Tools</p>
        <div className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface-raised p-1">
          {TOOLS.map(({ id, icon: Icon, label: toolLabel, hotkey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              title={`${toolLabel} (${hotkey})`}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors",
                tool === id ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="text-[9px] font-medium">{toolLabel}</span>
            </button>
          ))}
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
        label="Label for new shapes (optional)"
        placeholder="e.g. nodule, lesion, region…"
        value={label}
        maxLength={100}
        onChange={(event) => setLabel(event.target.value)}
      />

      {/* Window/level-style display adjustments — non-destructive, persist across the series */}
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
          <AdjustmentSlider
            label="Bright"
            min={-0.6}
            max={0.6}
            step={0.02}
            value={brightness}
            onChange={setBrightness}
          />
          <AdjustmentSlider
            label="Contrast"
            min={-60}
            max={60}
            step={2}
            value={contrast}
            onChange={setContrast}
          />
          <AdjustmentSlider
            label="Saturate"
            min={-1}
            max={1}
            step={0.05}
            value={saturation}
            onChange={setSaturation}
          />
          <div className="flex gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={toggleInvert}
              aria-pressed={invert}
              className={cn(
                "flex-1 cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                invert
                  ? "border-accent-strong bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              Invert
            </button>
            <button
              type="button"
              onClick={toggleGrayscale}
              aria-pressed={grayscale}
              className={cn(
                "flex-1 cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                grayscale
                  ? "border-accent-strong bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              Grayscale
            </button>
          </div>
          <AdjustmentSlider
            label="Overlay"
            min={0}
            max={0.6}
            step={0.02}
            value={overlayOpacity}
            onChange={setOverlayOpacity}
          />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-relaxed text-faint">
        <dt className="font-mono">v p r l o</dt>
        <dd>select · polygon · box · line · point</dd>
        <dt className="font-mono">wheel</dt>
        <dd>scroll images · +Ctrl zooms</dd>
        <dt className="font-mono">← →</dt>
        <dd>previous / next image</dd>
        <dt className="font-mono">enter</dt>
        <dd>finish polygon / line</dd>
        <dt className="font-mono">ctrl+z / y</dt>
        <dd>undo / redo</dd>
        <dt className="font-mono">ctrl+d</dt>
        <dd>duplicate selection</dd>
        <dt className="font-mono">h</dt>
        <dd>hide / show overlays</dd>
        <dt className="font-mono">esc · ⌫</dt>
        <dd>cancel · undo vertex / delete</dd>
      </dl>
    </div>
  );
}
