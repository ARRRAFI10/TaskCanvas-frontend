import { create } from "zustand";

import type { NormalizedPoint } from "@/lib/types";

export const PRESET_COLORS = [
  "#22d3ee", // cyan
  "#34d399", // green
  "#fbbf24", // amber
  "#f87171", // red
  "#a78bfa", // violet
  "#f472b6", // pink
] as const;

/** "select" edits existing shapes; the rest are creation tools. */
export type AnnotateTool = "select" | "polygon" | "rectangle" | "point" | "polyline";

/**
 * Viewer state for /annotate. The active image is tracked by id (not index)
 * so uploads/deletions can't silently retarget the canvas. Draft points are
 * normalized 0..1 — the canvas denormalizes at render time. Display
 * adjustments persist across the series, like window/level in a PACS.
 */
interface AnnotateState {
  activeImageId: number | null;
  tool: AnnotateTool;
  color: string;
  label: string;
  draftPoints: NormalizedPoint[];
  selectedAnnotationId: number | null;
  brightness: number; // -1..1 (Konva Brighten)
  contrast: number; // -100..100 (Konva Contrast)
  saturation: number; // -1..1 (Konva HSL)
  invert: boolean;
  grayscale: boolean;
  overlayOpacity: number; // 0..0.6 fill alpha for shapes
  showAnnotations: boolean;
  hiddenIds: number[];
  setActiveImage: (id: number | null) => void;
  setTool: (tool: AnnotateTool) => void;
  setColor: (color: string) => void;
  setLabel: (label: string) => void;
  addDraftPoint: (point: NormalizedPoint) => void;
  popDraftPoint: () => void;
  clearDraft: () => void;
  setSelected: (id: number | null) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  toggleInvert: () => void;
  toggleGrayscale: () => void;
  setOverlayOpacity: (value: number) => void;
  resetAdjustments: () => void;
  toggleAnnotationsVisible: () => void;
  toggleHidden: (id: number) => void;
}

export const useAnnotateStore = create<AnnotateState>((set) => ({
  activeImageId: null,
  tool: "polygon",
  color: PRESET_COLORS[0],
  label: "",
  draftPoints: [],
  selectedAnnotationId: null,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  invert: false,
  grayscale: false,
  overlayOpacity: 0.2,
  showAnnotations: true,
  hiddenIds: [],
  setActiveImage: (activeImageId) =>
    set({ activeImageId, draftPoints: [], selectedAnnotationId: null }),
  setTool: (tool) => set({ tool, draftPoints: [], selectedAnnotationId: null }),
  setColor: (color) => set({ color }),
  setLabel: (label) => set({ label }),
  addDraftPoint: (point) => set((state) => ({ draftPoints: [...state.draftPoints, point] })),
  popDraftPoint: () => set((state) => ({ draftPoints: state.draftPoints.slice(0, -1) })),
  clearDraft: () => set({ draftPoints: [] }),
  setSelected: (selectedAnnotationId) => set({ selectedAnnotationId }),
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),
  toggleInvert: () => set((state) => ({ invert: !state.invert })),
  toggleGrayscale: () => set((state) => ({ grayscale: !state.grayscale })),
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  resetAdjustments: () =>
    set({ brightness: 0, contrast: 0, saturation: 0, invert: false, grayscale: false }),
  toggleAnnotationsVisible: () =>
    set((state) => ({ showAnnotations: !state.showAnnotations, selectedAnnotationId: null })),
  toggleHidden: (id) =>
    set((state) => ({
      hiddenIds: state.hiddenIds.includes(id)
        ? state.hiddenIds.filter((hidden) => hidden !== id)
        : [...state.hiddenIds, id],
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),
}));
