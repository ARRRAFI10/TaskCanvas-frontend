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

export type AnnotateMode = "draw" | "select";

/**
 * Viewer state for /annotate. The active image is tracked by id (not index)
 * so uploads/deletions can't silently retarget the canvas. Draft polygon
 * points are normalized 0..1 — the canvas denormalizes at render time.
 * Brightness/contrast persist across images, like window/level in a PACS.
 */
interface AnnotateState {
  activeImageId: number | null;
  mode: AnnotateMode;
  color: string;
  label: string;
  draftPoints: NormalizedPoint[];
  selectedAnnotationId: number | null;
  brightness: number; // -1..1 (Konva Brighten)
  contrast: number; // -100..100 (Konva Contrast)
  showAnnotations: boolean;
  hiddenIds: number[];
  setActiveImage: (id: number | null) => void;
  setMode: (mode: AnnotateMode) => void;
  setColor: (color: string) => void;
  setLabel: (label: string) => void;
  addDraftPoint: (point: NormalizedPoint) => void;
  popDraftPoint: () => void;
  clearDraft: () => void;
  setSelected: (id: number | null) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  resetAdjustments: () => void;
  toggleAnnotationsVisible: () => void;
  toggleHidden: (id: number) => void;
}

export const useAnnotateStore = create<AnnotateState>((set) => ({
  activeImageId: null,
  mode: "draw",
  color: PRESET_COLORS[0],
  label: "",
  draftPoints: [],
  selectedAnnotationId: null,
  brightness: 0,
  contrast: 0,
  showAnnotations: true,
  hiddenIds: [],
  setActiveImage: (activeImageId) =>
    set({ activeImageId, draftPoints: [], selectedAnnotationId: null }),
  setMode: (mode) => set({ mode, draftPoints: [], selectedAnnotationId: null }),
  setColor: (color) => set({ color }),
  setLabel: (label) => set({ label }),
  addDraftPoint: (point) => set((state) => ({ draftPoints: [...state.draftPoints, point] })),
  popDraftPoint: () => set((state) => ({ draftPoints: state.draftPoints.slice(0, -1) })),
  clearDraft: () => set({ draftPoints: [] }),
  setSelected: (selectedAnnotationId) => set({ selectedAnnotationId }),
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  resetAdjustments: () => set({ brightness: 0, contrast: 0 }),
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
