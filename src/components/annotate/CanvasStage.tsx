"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { ImageOff, Maximize } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Stage } from "react-konva";

import { Spinner } from "@/components/ui/Button";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import type { Annotation, ImageItem, NormalizedPoint } from "@/lib/types";
import { cn, hexToRgba } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.15;
const CLOSE_THRESHOLD_PX = 12;
const SCROLL_COOLDOWN_MS = 140;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface CanvasStageProps {
  image: ImageItem;
  annotations: Annotation[];
  index: number;
  total: number;
  onNavigate: (delta: number) => void;
  onCreatePolygon: (points: NormalizedPoint[]) => void;
  onUpdatePolygon: (id: number, points: NormalizedPoint[]) => void;
}

/** Loads the bitmap; render-time reset keeps status in sync with src. */
function useHtmlImage(src: string) {
  const [nonce, setNonce] = useState(0);
  const key = `${src}#${nonce}`;
  const [state, setState] = useState<{
    key: string;
    image: HTMLImageElement | null;
    status: "loading" | "loaded" | "error";
  }>({ key, image: null, status: "loading" });
  if (state.key !== key) setState({ key, image: null, status: "loading" });

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setState({ key, image: img, status: "loaded" });
    img.onerror = () => setState({ key, image: null, status: "error" });
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, key]);

  return { image: state.image, status: state.status, retry: () => setNonce((n) => n + 1) };
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

export default function CanvasStage({
  image,
  annotations,
  index,
  total,
  onNavigate,
  onCreatePolygon,
  onUpdatePolygon,
}: CanvasStageProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const bitmap = useHtmlImage(image.file);
  const imageNodeRef = useRef<Konva.Image>(null);

  const mode = useAnnotateStore((state) => state.mode);
  const color = useAnnotateStore((state) => state.color);
  const draftPoints = useAnnotateStore((state) => state.draftPoints);
  const selectedId = useAnnotateStore((state) => state.selectedAnnotationId);
  const brightness = useAnnotateStore((state) => state.brightness);
  const contrast = useAnnotateStore((state) => state.contrast);
  const showAnnotations = useAnnotateStore((state) => state.showAnnotations);
  const hiddenIds = useAnnotateStore((state) => state.hiddenIds);
  const addDraftPoint = useAnnotateStore((state) => state.addDraftPoint);
  const clearDraft = useAnnotateStore((state) => state.clearDraft);
  const setSelected = useAnnotateStore((state) => state.setSelected);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null); // image px
  const [hoverId, setHoverId] = useState<number | null>(null);
  // Live geometry while a vertex is being dragged (image px)
  const [editing, setEditing] = useState<{ id: number; points: { x: number; y: number }[] } | null>(
    null,
  );
  const lastScrollRef = useRef(0);

  // Konva filters need the node cached once the bitmap is on the canvas.
  useEffect(() => {
    if (bitmap.image) imageNodeRef.current?.cache();
  }, [bitmap.image]);

  // ---- viewer transform: image pixels -> stage pixels ----------------------
  const fits = size.width > 0 && size.height > 0 && image.width > 0;
  const baseScale = fits
    ? Math.min(size.width / image.width, size.height / image.height)
    : 1;
  const scale = baseScale * zoom;
  const pos = {
    x: (size.width - image.width * scale) / 2 + pan.x,
    y: (size.height - image.height * scale) / 2 + pan.y,
  };

  const toImagePoint = (stagePoint: { x: number; y: number }) => ({
    x: (stagePoint.x - pos.x) / scale,
    y: (stagePoint.y - pos.y) / scale,
  });
  const toStagePoint = (imagePoint: { x: number; y: number }) => ({
    x: pos.x + imagePoint.x * scale,
    y: pos.y + imagePoint.y * scale,
  });
  const denormalize = ([nx, ny]: NormalizedPoint) => ({
    x: nx * image.width,
    y: ny * image.height,
  });
  const normalize = (p: { x: number; y: number }): NormalizedPoint => [
    clamp01(p.x / image.width),
    clamp01(p.y / image.height),
  ];
  /** Keeps dragged vertex handles inside the image (absolute stage coords). */
  const clampToImageAbs = (p: { x: number; y: number }) => ({
    x: Math.min(Math.max(p.x, pos.x), pos.x + image.width * scale),
    y: Math.min(Math.max(p.y, pos.y), pos.y + image.height * scale),
  });

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ---- interactions ---------------------------------------------------------
  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (event.evt.ctrlKey || event.evt.metaKey) {
      if (!pointer) return;
      const factor = event.evt.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      if (newZoom === 1) {
        resetView();
        return;
      }
      // Keep the image point under the cursor stationary while zooming.
      const imagePoint = toImagePoint(pointer);
      const newScale = baseScale * newZoom;
      const newBase = {
        x: (size.width - image.width * newScale) / 2,
        y: (size.height - image.height * newScale) / 2,
      };
      setPan({
        x: pointer.x - imagePoint.x * newScale - newBase.x,
        y: pointer.y - imagePoint.y * newScale - newBase.y,
      });
      setZoom(newZoom);
      return;
    }

    // Radiology-style stack scroll between images.
    const now = Date.now();
    if (now - lastScrollRef.current < SCROLL_COOLDOWN_MS) return;
    lastScrollRef.current = now;
    if (draftPoints.length > 0) return; // never switch mid-polygon
    onNavigate(event.evt.deltaY > 0 ? 1 : -1);
  };

  const closeDraft = (points: NormalizedPoint[]) => {
    if (points.length >= 3) onCreatePolygon(points);
    clearDraft();
  };

  const handleClick = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if ("button" in event.evt && event.evt.button !== 0) return;
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;

    if (mode === "select") {
      // Polygon clicks cancel bubbling; reaching here means empty space.
      setSelected(null);
      return;
    }

    // Draw mode: close when clicking the first vertex, otherwise add one.
    if (draftPoints.length >= 3) {
      const first = toStagePoint(denormalize(draftPoints[0]));
      if (Math.hypot(pointer.x - first.x, pointer.y - first.y) < CLOSE_THRESHOLD_PX) {
        closeDraft(draftPoints);
        return;
      }
    }
    const imagePoint = toImagePoint(pointer);
    addDraftPoint(normalize(imagePoint));
  };

  const handleDblClick = () => {
    if (mode !== "draw" || draftPoints.length < 3) return;
    // The double-click registered two single clicks first — drop the duplicate.
    const points = draftPoints.length > 3 ? draftPoints.slice(0, -1) : draftPoints;
    closeDraft(points);
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const pointer = event.target.getStage()?.getPointerPosition();
    setCursor(pointer ? toImagePoint(pointer) : null);
  };

  /** Whole-polygon drag: clamp the translation so no vertex leaves the image. */
  const handlePolygonDragEnd = (annotation: Annotation, event: KonvaEventObject<DragEvent>) => {
    const dx = event.target.x();
    const dy = event.target.y();
    event.target.position({ x: 0, y: 0 });
    const px = annotation.points.map(denormalize);
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const clampedDx = Math.min(Math.max(dx, -Math.min(...xs)), image.width - Math.max(...xs));
    const clampedDy = Math.min(Math.max(dy, -Math.min(...ys)), image.height - Math.max(...ys));
    if (clampedDx === 0 && clampedDy === 0) return;
    onUpdatePolygon(
      annotation.id,
      px.map((p) => normalize({ x: p.x + clampedDx, y: p.y + clampedDy })),
    );
  };

  // ---- render ----------------------------------------------------------------
  const visibleAnnotations = showAnnotations
    ? annotations.filter((annotation) => !hiddenIds.includes(annotation.id))
    : [];
  const draftStagePoints = draftPoints.map(denormalize);
  const previewLine =
    mode === "draw" && cursor && draftStagePoints.length > 0
      ? [...draftStagePoints, cursor].flatMap((p) => [p.x, p.y])
      : null;
  const cursorInImage =
    cursor && cursor.x >= 0 && cursor.x <= image.width && cursor.y >= 0 && cursor.y <= image.height;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-black/50",
          mode === "draw" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {bitmap.status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-6 text-accent" />
          </div>
        )}
        {bitmap.status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <ImageOff className="size-8 text-faint" />
            <p className="text-sm text-muted">This image failed to load.</p>
            <button
              type="button"
              onClick={bitmap.retry}
              className="cursor-pointer rounded-md border border-border-strong px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Try again
            </button>
          </div>
        )}

        {fits && bitmap.status === "loaded" && bitmap.image && (
          <Stage
            width={size.width}
            height={size.height}
            onWheel={handleWheel}
            onClick={handleClick}
            onTap={handleClick}
            onDblClick={handleDblClick}
            onDblTap={handleDblClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setCursor(null)}
          >
            <Layer>
              <Group
                x={pos.x}
                y={pos.y}
                scaleX={scale}
                scaleY={scale}
                draggable={mode === "select" && editing === null}
                onDragEnd={(event) => {
                  if (event.target.getClassName() !== "Group") return;
                  setPan({
                    x: event.target.x() - (size.width - image.width * scale) / 2,
                    y: event.target.y() - (size.height - image.height * scale) / 2,
                  });
                }}
              >
                <KonvaImage
                  ref={imageNodeRef}
                  image={bitmap.image}
                  width={image.width}
                  height={image.height}
                  filters={[Konva.Filters.Brighten, Konva.Filters.Contrast]}
                  brightness={brightness}
                  contrast={contrast}
                />

                {/* Saved polygons (normalized -> image px) */}
                {visibleAnnotations.map((annotation) => {
                  const isSelected = annotation.id === selectedId;
                  const isHover = annotation.id === hoverId;
                  const points =
                    editing?.id === annotation.id
                      ? editing.points
                      : annotation.points.map(denormalize);
                  const flat = points.flatMap((p) => [p.x, p.y]);
                  return (
                    <Group key={annotation.id}>
                      <Line
                        points={flat}
                        closed
                        fill={hexToRgba(annotation.color, isSelected ? 0.35 : 0.18)}
                        stroke={annotation.color}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeScaleEnabled={false}
                        shadowColor={annotation.color}
                        shadowBlur={isSelected || isHover ? 12 : 0}
                        shadowOpacity={0.9}
                        listening={mode === "select"}
                        draggable={mode === "select" && isSelected && annotation.id > 0}
                        onDragEnd={(event) => handlePolygonDragEnd(annotation, event)}
                        onClick={(event) => {
                          event.cancelBubble = true;
                          setSelected(annotation.id);
                        }}
                        onTap={(event) => {
                          event.cancelBubble = true;
                          setSelected(annotation.id);
                        }}
                        onMouseEnter={() => setHoverId(annotation.id)}
                        onMouseLeave={() => setHoverId(null)}
                      />
                      {/* Draggable vertex handles reshape the polygon */}
                      {isSelected &&
                        points.map((point, i) => (
                          <Circle
                            key={i}
                            x={point.x}
                            y={point.y}
                            radius={5.5 / scale}
                            fill="#0a0f14"
                            stroke={annotation.color}
                            strokeWidth={2}
                            strokeScaleEnabled={false}
                            draggable={annotation.id > 0}
                            dragBoundFunc={clampToImageAbs}
                            onDragStart={() =>
                              setEditing({
                                id: annotation.id,
                                points: annotation.points.map(denormalize),
                              })
                            }
                            onDragMove={(event) => {
                              const { x, y } = event.target.position();
                              setEditing((current) =>
                                current
                                  ? {
                                      ...current,
                                      points: current.points.map((p, idx) =>
                                        idx === i ? { x, y } : p,
                                      ),
                                    }
                                  : current,
                              );
                            }}
                            onDragEnd={(event) => {
                              const { x, y } = event.target.position();
                              const updated = (editing?.points ?? points).map((p, idx) =>
                                idx === i ? { x, y } : p,
                              );
                              onUpdatePolygon(annotation.id, updated.map(normalize));
                              setEditing(null);
                            }}
                            onMouseEnter={(event) => {
                              const container = event.target.getStage()?.container();
                              if (container) container.style.cursor = "move";
                            }}
                            onMouseLeave={(event) => {
                              const container = event.target.getStage()?.container();
                              if (container) container.style.cursor = "";
                            }}
                          />
                        ))}
                    </Group>
                  );
                })}

                {/* Draft polygon preview */}
                {previewLine && (
                  <Line
                    points={previewLine}
                    stroke={color}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}
                {mode === "draw" &&
                  draftStagePoints.map((point, i) => {
                    const isFirst = i === 0;
                    const closable = isFirst && draftPoints.length >= 3;
                    return (
                      <Circle
                        key={i}
                        x={point.x}
                        y={point.y}
                        radius={(closable ? 7 : 4.5) / scale}
                        fill={closable ? color : "#0a0f14"}
                        stroke={closable ? "#ffffff" : color}
                        strokeWidth={closable ? 2 : 1.5}
                        strokeScaleEnabled={false}
                        listening={false}
                      />
                    );
                  })}
              </Group>
            </Layer>
          </Stage>
        )}
      </div>

      {/* PACS-style status bar */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted">
        <span className="shrink-0">
          <span className="text-accent">{index + 1}</span> / {total}
          <span className="ml-2 hidden text-faint sm:inline">{image.original_name}</span>
        </span>
        <span className="hidden truncate md:inline">
          {mode === "draw"
            ? draftPoints.length > 0
              ? `${draftPoints.length} vertices · click first point or double-click to close · Esc cancels`
              : "click to place vertices · wheel scrolls images · Ctrl+wheel zooms"
            : "click to select · drag body to move · drag handles to reshape · Del removes"}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {cursorInImage && cursor && (
            <span>
              {Math.round(cursor.x)}, {Math.round(cursor.y)} px
            </span>
          )}
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={resetView}
            className="cursor-pointer rounded p-0.5 transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <Maximize className="size-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}
