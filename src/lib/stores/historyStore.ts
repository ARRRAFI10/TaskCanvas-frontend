import { create } from "zustand";

import type { NormalizedPoint, ShapeType } from "@/lib/types";

export interface ShapeSnapshot {
  shape_type: ShapeType;
  label: string;
  color: string;
  points: NormalizedPoint[];
}

/**
 * A performed operation. Undo applies its inverse; redo re-applies it.
 * Entries are mutable on purpose: re-creating a deleted shape yields a new
 * server id, which the executor writes back so redo stays consistent.
 */
export type HistoryEntry =
  | { op: "create"; id: number; snapshot: ShapeSnapshot }
  | { op: "delete"; id: number; snapshot: ShapeSnapshot }
  | { op: "update"; id: number; before: Partial<ShapeSnapshot>; after: Partial<ShapeSnapshot> };

const STACK_LIMIT = 50;

interface HistoryState {
  /** Per-image undo/redo stacks (undo history is scoped to one image). */
  stacks: Record<number, { undo: HistoryEntry[]; redo: HistoryEntry[] }>;
  /** True while the executor replays an entry — recording is suspended. */
  restoring: boolean;
  record: (imageId: number, entry: HistoryEntry) => void;
  popUndo: (imageId: number) => HistoryEntry | undefined;
  popRedo: (imageId: number) => HistoryEntry | undefined;
  pushUndoRaw: (imageId: number, entry: HistoryEntry) => void;
  pushRedoRaw: (imageId: number, entry: HistoryEntry) => void;
  setRestoring: (value: boolean) => void;
}

const emptyStack = () => ({ undo: [], redo: [] });

export const useHistoryStore = create<HistoryState>((set, get) => ({
  stacks: {},
  restoring: false,

  record: (imageId, entry) => {
    if (get().restoring) return;
    set((state) => {
      const stack = state.stacks[imageId] ?? emptyStack();
      return {
        stacks: {
          ...state.stacks,
          [imageId]: { undo: [...stack.undo, entry].slice(-STACK_LIMIT), redo: [] },
        },
      };
    });
  },

  popUndo: (imageId) => {
    const stack = get().stacks[imageId];
    const entry = stack?.undo[stack.undo.length - 1];
    if (entry) {
      set((state) => ({
        stacks: {
          ...state.stacks,
          [imageId]: { ...stack, undo: stack.undo.slice(0, -1) },
        },
      }));
    }
    return entry;
  },

  popRedo: (imageId) => {
    const stack = get().stacks[imageId];
    const entry = stack?.redo[stack.redo.length - 1];
    if (entry) {
      set((state) => ({
        stacks: {
          ...state.stacks,
          [imageId]: { ...stack, redo: stack.redo.slice(0, -1) },
        },
      }));
    }
    return entry;
  },

  pushUndoRaw: (imageId, entry) =>
    set((state) => {
      const stack = state.stacks[imageId] ?? emptyStack();
      return {
        stacks: {
          ...state.stacks,
          [imageId]: { ...stack, undo: [...stack.undo, entry].slice(-STACK_LIMIT) },
        },
      };
    }),

  pushRedoRaw: (imageId, entry) =>
    set((state) => {
      const stack = state.stacks[imageId] ?? emptyStack();
      return {
        stacks: {
          ...state.stacks,
          [imageId]: { ...stack, redo: [...stack.redo, entry].slice(-STACK_LIMIT) },
        },
      };
    }),

  setRestoring: (restoring) => set({ restoring }),
}));
