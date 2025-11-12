/**
 * Design Lab Store
 * [2025-11-11 15:43:55] 使用 Zustand + Immer 管理画布状态、撤销重做与移动端锁定
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DesignCanvasSnapshot, DesignDraft } from '@/lib/api';

type EditorMode = 'edit' | 'quick-edit' | 'preview';

interface DesignLabState {
  draft?: DesignDraft;
  canvas: DesignCanvasSnapshot;
  history: DesignCanvasSnapshot[];
  future: DesignCanvasSnapshot[];
  mode: EditorMode;
  mobileLocked: boolean;
  setDraft: (draft: DesignDraft) => void;
  patchDraft: (changes: Partial<DesignDraft>) => void;
  setCanvas: (snapshot: DesignCanvasSnapshot, options?: { pushHistory?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  setMode: (mode: EditorMode) => void;
  setMobileLocked: (locked: boolean) => void;
}

const defaultSnapshot: DesignCanvasSnapshot = {
  size: { width: 500, height: 600 },
  objects: [],
  version: '5.0.0',
};

export const useDesignLabStore = create<DesignLabState>()(
  immer((set, get) => ({
    draft: undefined,
    canvas: defaultSnapshot,
    history: [],
    future: [],
    mode: 'edit',
    mobileLocked: false,
    setDraft: (draft: DesignDraft) =>
      set((state) => {
        state.draft = draft;
        state.canvas = draft.canvasSnapshot || defaultSnapshot;
        state.history = [];
        state.future = [];
      }),
    patchDraft: (changes: Partial<DesignDraft>) =>
      set((state) => {
        if (state.draft) {
          state.draft = { ...state.draft, ...changes };
        }
      }),
    setCanvas: (snapshot: DesignCanvasSnapshot, options = { pushHistory: true }) =>
      set((state) => {
        if (options.pushHistory) {
          state.history.push(state.canvas);
          if (state.history.length > 20) {
            state.history.shift();
          }
        }
        state.canvas = snapshot;
        state.future = [];
      }),
    undo: () =>
      set((state) => {
        if (!state.history.length) {
          return;
        }
        const previous = state.history.pop();
        if (previous) {
          state.future.unshift(state.canvas);
          state.canvas = previous;
        }
      }),
    redo: () =>
      set((state) => {
        if (!state.future.length) {
          return;
        }
        const next = state.future.shift();
        if (next) {
          state.history.push(state.canvas);
          state.canvas = next;
        }
      }),
    setMode: (mode: EditorMode) =>
      set((state) => {
        state.mode = mode;
      }),
    setMobileLocked: (locked: boolean) =>
      set((state) => {
        state.mobileLocked = locked;
      }),
  }))
);


