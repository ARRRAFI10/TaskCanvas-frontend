"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { ImageOff, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";

import { Spinner } from "@/components/ui/Button";
import { useAnnotateStore } from "@/lib/stores/annotateStore";
import type { Annotation, ImageItem, NormalizedPoint, ShapeType } from "@/lib/types";
import { cn, hexToRgba } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const WHEEL_ZOOM_STEP = 1.15;
const BUTTON_ZOOM_STEP = 1.5;
const CLOSE_THRESHOLD_PX = 12;
const MIN_RECT_SIZE_PX = 5;
const SCROLL_COOLDOWN_MS = 140;
const MIN_POINTS: Record<ShapeType, number> = { polygon: 3, polyline: 2, rectangle: 2, point: 1 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const ZOOM_BUTTON_CLASS =
  "cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted";

const TOOL_HINTS: Record<string, string> = {
  select:
    "click to select · drag body or handles to edit · edge dots add vertices · dbl-click a handle removes it",
  polygon: "click to place vertices · wheel scrolls images · Ctrl+wheel zooms",
  polyline: "click to add points · double-click or Enter to finish · Esc cancels",
  rectangle: "press and drag to draw a box",
  point: "click to drop a point marker",
};

interface CanvasStageProps {
  image: ImageItem;
  annotations: Annotation[];
  index: number;
  total: number;
  onNavigate: (delta: number) => void;
  onCreateShape: (points: NormalizedPoint[], shapeType: ShapeType) => void;
  onUpdateShape: (id: number, points: NormalizedPoint[]) => void;
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
    // Without this the canvas is tainted by the cross-origin media URL and
    // Konva filters (getImageData) throw a SecurityError.
    img.crossOrigin = "anonymous";
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
  onCreateShape,
  onUpdateShape,
}: CanvasStageProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const bitmap = useHtmlImage(image.file);
  const imageNodeRef = useRef<Konva.Image>(null);

  const tool = useAnnotateStore((state) => state.tool);
  const color = useAnnotateStore((state) => state.color);
  const draftPoints = useAnnotateStore((state) => state.draftPoints);
  const selectedId = useAnnotateStore((state) => state.selectedAnnotationId);
  const brightness = useAnnotateStore((state) => state.brightness);
  const contrast = useAnnotateStore((state) => state.contrast);
  const saturation = useAnnotateStore((state) => state.saturation);
  const invert = useAnnotateStore((state) => state.invert);
  const grayscale = useAnnotateStore((state) => state.grayscale);
  const overlayOpacity = useAnnotateStore((state) => state.overlayOpacity);
  const showAnnotations = useAnnotateStore((state) => state.showAnnotations);
  const hiddenIds = useAnnotateStore((state) => state.hiddenIds);
  const addDraftPoint = useAnnotateStore((state) => state.addDraftPoint);
  const clearDraft = useAnnotateStore((state) => state.clearDraft);
  const setSelected = useAnnotateStore((state) => state.setSelected);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null); // image px
  const [hoverId, setHoverId] = useState<number | null>(null);
  // Live geometry while a handle is being dragged (image px)
  const [editing, setEditing] = useState<{ id: number; points: { x: number; y: number }[] } | null>(
    null,
  );
  // In-flight rectangle draft (image px), driven by pointer down/move/up
  const [draftRect, setDraftRect] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);
  const lastScrollRef = useRef(0);

  const filters = useMemo(() => {
    const list = [Konva.Filters.Brighten, Konva.Filters.Contrast];
    if (saturation !== 0) list.push(Konva.Filters.HSL);
    if (grayscale) list.push(Konva.Filters.Grayscale);
    if (invert) list.push(Konva.Filters.Invert);
    return list;
  }, [saturation, grayscale, invert]);

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
  /** Keeps dragged handles inside the image (absolute stage coords). */
  const clampToImageAbs = (p: { x: number; y: number }) => ({
    x: Math.min(Math.max(p.x, pos.x), pos.x + image.width * scale),
    y: Math.min(Math.max(p.y, pos.y), pos.y + image.height * scale),
  });

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const applyZoom = (targetZoom: number, focal: { x: number; y: number }) => {
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
    if (newZoom === 1) {
      resetView();
      return;
    }
    // Keep the image point under the focal spot stationary while zooming.
    const imagePoint = toImagePoint(focal);
    const newScale = baseScale * newZoom;
    const newBase = {
      x: (size.width - image.width * newScale) / 2,
      y: (size.height - image.height * newScale) / 2,
    };
    setPan({
      x: focal.x - imagePoint.x * newScale - newBase.x,
      y: focal.y - imagePoint.y * newScale - newBase.y,
    });
    setZoom(newZoom);
  };

  /** Button/keyboard zoom: steps around the viewport center. */
  const zoomBy = (factor: number) =>
    applyZoom(zoom * factor, { x: size.width / 2, y: size.height / 2 });

  // The window-level listener subscribes once; the ref keeps it on fresh state.
  const zoomShortcutsRef = useRef({ zoomBy, resetView });
  useEffect(() => {
    zoomShortcutsRef.current = { zoomBy, resetView };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return; // leave browser zoom alone
      if (event.key === "+" || event.key === "=") zoomShortcutsRef.current.zoomBy(BUTTON_ZOOM_STEP);
      else if (event.key === "-" || event.key === "_")
        zoomShortcutsRef.current.zoomBy(1 / BUTTON_ZOOM_STEP);
      else if (event.key === "0") zoomShortcutsRef.current.resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- interactions ---------------------------------------------------------
  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = event.target.getStage()?.getPointerPosition();

    if (event.evt.ctrlKey || event.evt.metaKey) {
      if (!pointer) return;
      const factor = event.evt.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
      applyZoom(zoom * factor, pointer);
      return;
    }

    // Radiology-style stack scroll between images.
    const now = Date.now();
    if (now - lastScrollRef.current < SCROLL_COOLDOWN_MS) return;
    lastScrollRef.current = now;
    if (draftPoints.length > 0 || draftRect) return; // never switch mid-shape
    onNavigate(event.evt.deltaY > 0 ? 1 : -1);
  };

  const finishPath = (points: NormalizedPoint[], shape: "polygon" | "polyline") => {
    if (points.length >= MIN_POINTS[shape]) onCreateShape(points, shape);
    clearDraft();
  };

  const handleMouseDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== "rectangle") return;
    if ("button" in event.evt && event.evt.button !== 0) return;
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const imagePoint = toImagePoint(pointer);
    setDraftRect({ start: imagePoint, current: imagePoint });
  };

  const handleMouseUp = () => {
    if (!draftRect) return;
    const { start, current } = draftRect;
    setDraftRect(null);
    if (
      Math.abs(current.x - start.x) * scale < MIN_RECT_SIZE_PX ||
      Math.abs(current.y - start.y) * scale < MIN_RECT_SIZE_PX
    ) {
      return; // accidental click, not a box
    }
    const [x1, y1] = normalize({ x: Math.min(start.x, current.x), y: Math.min(start.y, current.y) });
    const [x2, y2] = normalize({ x: Math.max(start.x, current.x), y: Math.max(start.y, current.y) });
    onCreateShape(
      [
        [x1, y1],
        [x2, y2],
      ],
      "rectangle",
    );
  };

  const handleClick = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if ("button" in event.evt && event.evt.button !== 0) return;
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;

    switch (tool) {
      case "select":
        // Shape clicks cancel bubbling; reaching here means empty space.
        setSelected(null);
        return;
      case "rectangle":
        return; // handled by mousedown/mouseup
      case "point":
        onCreateShape([normalize(toImagePoint(pointer))], "point");
        return;
      case "polygon":
        // Close when clicking the first vertex again.
        if (draftPoints.length >= 3) {
          const first = toStagePoint(denormalize(draftPoints[0]));
          if (Math.hypot(pointer.x - first.x, pointer.y - first.y) < CLOSE_THRESHOLD_PX) {
            finishPath(draftPoints, "polygon");
            return;
          }
        }
        addDraftPoint(normalize(toImagePoint(pointer)));
        return;
      case "polyline":
        addDraftPoint(normalize(toImagePoint(pointer)));
        return;
    }
  };

  const handleDblClick = () => {
    if (tool !== "polygon" && tool !== "polyline") return;
    if (draftPoints.length < MIN_POINTS[tool]) return;
    // The double-click registered two single clicks first — drop the duplicate.
    const points =
      draftPoints.length > MIN_POINTS[tool] ? draftPoints.slice(0, -1) : draftPoints;
    finishPath(points, tool);
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const pointer = event.target.getStage()?.getPointerPosition();
    const imagePoint = pointer ? toImagePoint(pointer) : null;
    setCursor(imagePoint);
    if (draftRect && imagePoint) {
      setDraftRect({ ...draftRect, current: imagePoint });
    }
  };

  /** Whole-shape drag: clamp the translation so no vertex leaves the image. */
  const handleShapeDragEnd = (
    annotation: Annotation,
    event: KonvaEventObject<DragEvent>,
    base = { x: 0, y: 0 },
  ) => {
    const dx = event.target.x() - base.x;
    const dy = event.target.y() - base.y;
    event.target.position(base);
    const px = annotation.points.map(denormalize);
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const clampedDx = Math.min(Math.max(dx, -Math.min(...xs)), image.width - Math.max(...xs));
    const clampedDy = Math.min(Math.max(dy, -Math.min(...ys)), image.height - Math.max(...ys));
    if (clampedDx === 0 && clampedDy === 0) return;
    onUpdateShape(
      annotation.id,
      px.map((p) => normalize({ x: p.x + clampedDx, y: p.y + clampedDy })),
    );
  };

  const removeVertex = (annotation: Annotation, vertexIndex: number) => {
    if (annotation.points.length <= MIN_POINTS[annotation.shape_type]) return;
    onUpdateShape(
      annotation.id,
      annotation.points.filter((_, i) => i !== vertexIndex),
    );
  };

  const insertVertex = (annotation: Annotation, insertAt: number, point: { x: number; y: number }) => {
    const points = [...annotation.points];
    points.splice(insertAt, 0, normalize(point));
    onUpdateShape(annotation.id, points);
  };

  // ---- shared handle renderers ----------------------------------------------
  const renderVertexHandles = (annotation: Annotation, pts: { x: number; y: number }[]) =>
    pts.map((point, i) => (
      <Circle
        key={`v-${i}`}
        x={point.x}
        y={point.y}
        radius={5.5 / scale}
        fill="#0a0f14"
        stroke={annotation.color}
        strokeWidth={2}
        strokeScaleEnabled={false}
        draggable={annotation.id > 0}
        dragBoundFunc={clampToImageAbs}
        onDblClick={(event) => {
          event.cancelBubble = true;
          removeVertex(annotation, i);
        }}
        onDblTap={(event) => {
          event.cancelBubble = true;
          removeVertex(annotation, i);
        }}
        onDragStart={() =>
          setEditing({ id: annotation.id, points: annotation.points.map(denormalize) })
        }
        onDragMove={(event) => {
          const { x, y } = event.target.position();
          setEditing((current) =>
            current
              ? {
                  ...current,
                  points: current.points.map((p, idx) => (idx === i ? { x, y } : p)),
                }
              : current,
          );
        }}
        onDragEnd={(event) => {
          const { x, y } = event.target.position();
          const updated = (editing?.points ?? pts).map((p, idx) => (idx === i ? { x, y } : p));
          onUpdateShape(annotation.id, updated.map(normalize));
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
    ));

  /** Small dots on edge midpoints — clicking one inserts a vertex there. */
  const renderMidpointHandles = (annotation: Annotation, pts: { x: number; y: number }[]) => {
    if (editing?.id === annotation.id || annotation.id < 0) return null;
    const wrap = annotation.shape_type === "polygon";
    const segments = wrap ? pts.length : pts.length - 1;
    return Array.from({ length: segments }, (_, i) => {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return (
        <Circle
          key={`m-${i}`}
          x={mid.x}
          y={mid.y}
          radius={3.5 / scale}
          fill={annotation.color}
          opacity={0.55}
          strokeScaleEnabled={false}
          hitStrokeWidth={10}
          onClick={(event) => {
            event.cancelBubble = true;
            insertVertex(annotation, i + 1, mid);
          }}
          onTap={(event) => {
            event.cancelBubble = true;
            insertVertex(annotation, i + 1, mid);
          }}
          onMouseEnter={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = "copy";
          }}
          onMouseLeave={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = "";
          }}
        />
      );
    });
  };

  // ---- per-shape rendering ---------------------------------------------------
  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = annotation.id === selectedId;
    const isHover = annotation.id === hoverId;
    const pts =
      editing?.id === annotation.id ? editing.points : annotation.points.map(denormalize);
    const interactive = tool === "select";
    const movable = interactive && isSelected && annotation.id > 0;
    const fillAlpha = isSelected ? Math.min(overlayOpacity + 0.15, 0.7) : overlayOpacity;

    const selectHandlers = {
      onClick: (event: KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true;
        setSelected(annotation.id);
      },
      onTap: (event: KonvaEventObject<TouchEvent>) => {
        event.cancelBubble = true;
        setSelected(annotation.id);
      },
      onMouseEnter: () => setHoverId(annotation.id),
      onMouseLeave: () => setHoverId(null),
    };
    const glow = {
      shadowColor: annotation.color,
      shadowBlur: isSelected || isHover ? 12 : 0,
      shadowOpacity: 0.9,
    };

    if (annotation.shape_type === "rectangle") {
      const x = Math.min(pts[0].x, pts[1].x);
      const y = Math.min(pts[0].y, pts[1].y);
      const width = Math.abs(pts[1].x - pts[0].x);
      const height = Math.abs(pts[1].y - pts[0].y);
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      return (
        <Group key={annotation.id}>
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={hexToRgba(annotation.color, fillAlpha)}
            stroke={annotation.color}
            strokeWidth={isSelected ? 3 : 2}
            strokeScaleEnabled={false}
            listening={interactive}
            draggable={movable}
            onDragEnd={(event) => handleShapeDragEnd(annotation, event, { x, y })}
            {...glow}
            {...selectHandlers}
          />
          {isSelected &&
            corners.map((corner, k) => (
              <Circle
                key={`c-${k}`}
                x={corner.x}
                y={corner.y}
                radius={5.5 / scale}
                fill="#0a0f14"
                stroke={annotation.color}
                strokeWidth={2}
                strokeScaleEnabled={false}
                draggable={annotation.id > 0}
                dragBoundFunc={clampToImageAbs}
                onDragStart={() => {
                  const opposite = corners[(k + 2) % 4];
                  setEditing({ id: annotation.id, points: [opposite, corner] });
                }}
                onDragMove={(event) => {
                  const { x: mx, y: my } = event.target.position();
                  setEditing((current) =>
                    current ? { ...current, points: [current.points[0], { x: mx, y: my }] } : current,
                  );
                }}
                onDragEnd={(event) => {
                  const { x: mx, y: my } = event.target.position();
                  const fixed = editing?.points[0] ?? corners[(k + 2) % 4];
                  const [nx1, ny1] = normalize({
                    x: Math.min(fixed.x, mx),
                    y: Math.min(fixed.y, my),
                  });
                  const [nx2, ny2] = normalize({
                    x: Math.max(fixed.x, mx),
                    y: Math.max(fixed.y, my),
                  });
                  onUpdateShape(annotation.id, [
                    [nx1, ny1],
                    [nx2, ny2],
                  ]);
                  setEditing(null);
                }}
                onMouseEnter={(event) => {
                  const container = event.target.getStage()?.container();
                  if (container) container.style.cursor = "nwse-resize";
                }}
                onMouseLeave={(event) => {
                  const container = event.target.getStage()?.container();
                  if (container) container.style.cursor = "";
                }}
              />
            ))}
        </Group>
      );
    }

    if (annotation.shape_type === "point") {
      const p = pts[0];
      return (
        <Group key={annotation.id}>
          <Circle
            x={p.x}
            y={p.y}
            radius={8 / scale}
            fill={hexToRgba(annotation.color, Math.min(fillAlpha + 0.15, 0.8))}
            stroke={annotation.color}
            strokeWidth={2}
            strokeScaleEnabled={false}
            listening={interactive}
            draggable={movable}
            dragBoundFunc={clampToImageAbs}
            onDragEnd={(event) => {
              onUpdateShape(annotation.id, [normalize(event.target.position())]);
            }}
            {...glow}
            {...selectHandlers}
          />
          <Circle
            x={p.x}
            y={p.y}
            radius={2 / scale}
            fill={annotation.color}
            listening={false}
          />
          {isSelected && (
            <Circle
              x={p.x}
              y={p.y}
              radius={13 / scale}
              stroke={annotation.color}
              strokeWidth={1.5}
              strokeScaleEnabled={false}
              dash={[4, 4]}
              listening={false}
            />
          )}
        </Group>
      );
    }

    // polygon & polyline
    const closed = annotation.shape_type === "polygon";
    return (
      <Group key={annotation.id}>
        <Line
          points={pts.flatMap((p) => [p.x, p.y])}
          closed={closed}
          fill={closed ? hexToRgba(annotation.color, fillAlpha) : undefined}
          stroke={annotation.color}
          strokeWidth={isSelected ? 3 : 2}
          strokeScaleEnabled={false}
          hitStrokeWidth={14}
          listening={interactive}
          draggable={movable}
          onDragEnd={(event) => handleShapeDragEnd(annotation, event)}
          {...glow}
          {...selectHandlers}
        />
        {isSelected && renderVertexHandles(annotation, pts)}
        {isSelected && renderMidpointHandles(annotation, pts)}
      </Group>
    );
  };

  // ---- render ----------------------------------------------------------------
  const visibleAnnotations = showAnnotations
    ? annotations.filter((annotation) => !hiddenIds.includes(annotation.id))
    : [];
  const draftStagePoints = draftPoints.map(denormalize);
  const previewLine =
    (tool === "polygon" || tool === "polyline") && cursor && draftStagePoints.length > 0
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
          tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair",
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
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onClick={handleClick}
            onTap={handleClick}
            onDblClick={handleDblClick}
            onDblTap={handleDblClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setCursor(null);
              setDraftRect(null);
            }}
          >
            <Layer>
              <Group
                x={pos.x}
                y={pos.y}
                scaleX={scale}
                scaleY={scale}
                draggable={tool === "select" && editing === null}
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
                  filters={filters}
                  brightness={brightness}
                  contrast={contrast}
                  saturation={saturation}
                />

                {visibleAnnotations.map(renderAnnotation)}

                {/* Draft polygon/polyline preview */}
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
                {(tool === "polygon" || tool === "polyline") &&
                  draftStagePoints.map((point, i) => {
                    const closable = tool === "polygon" && i === 0 && draftPoints.length >= 3;
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

                {/* Draft rectangle preview */}
                {draftRect && (
                  <Rect
                    x={Math.min(draftRect.start.x, draftRect.current.x)}
                    y={Math.min(draftRect.start.y, draftRect.current.y)}
                    width={Math.abs(draftRect.current.x - draftRect.start.x)}
                    height={Math.abs(draftRect.current.y - draftRect.start.y)}
                    stroke={color}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                    fill={hexToRgba(color, 0.08)}
                    listening={false}
                  />
                )}
              </Group>
            </Layer>
          </Stage>
        )}

        {/* Floating zoom controls */}
        {fits && bitmap.status === "loaded" && bitmap.image && (
          <div className="absolute right-3 top-3 flex flex-col items-center rounded-lg border border-border bg-surface/85 p-1 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in (+ or Ctrl+wheel)"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => zoomBy(BUTTON_ZOOM_STEP)}
              className={ZOOM_BUTTON_CLASS}
            >
              <ZoomIn className="size-4" />
            </button>
            <span className="w-full select-none py-0.5 text-center font-mono text-[10px] text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out (− or Ctrl+wheel)"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
              className={ZOOM_BUTTON_CLASS}
            >
              <ZoomOut className="size-4" />
            </button>
            <div className="my-1 h-px w-5 bg-border" />
            <button
              type="button"
              aria-label="Fit to view"
              title="Fit to view (0)"
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              onClick={resetView}
              className={ZOOM_BUTTON_CLASS}
            >
              <Maximize className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* PACS-style status bar */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted">
        <span className="shrink-0">
          <span className="text-accent">{index + 1}</span> / {total}
          <span className="ml-2 hidden text-faint sm:inline">{image.original_name}</span>
        </span>
        <span className="hidden truncate md:inline">
          {tool === "polygon" && draftPoints.length > 0
            ? `${draftPoints.length} vertices · click first point, double-click, or Enter to close · Esc cancels`
            : tool === "polyline" && draftPoints.length > 0
              ? `${draftPoints.length} points · double-click or Enter to finish · Esc cancels`
              : TOOL_HINTS[tool]}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {cursorInImage && cursor && (
            <span className="mr-1">
              {Math.round(cursor.x)}, {Math.round(cursor.y)} px
            </span>
          )}
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
            className="cursor-pointer rounded p-0.5 transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomBy(BUTTON_ZOOM_STEP)}
            className="cursor-pointer rounded p-0.5 transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Fit to view"
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
