/**
 * Design Lab Store
 * [2025-11-11 15:43:55] 使用 Zustand + Immer 管理画布状态、撤销重做与移动端锁定
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DesignCanvasSnapshot, DesignDraft } from '@/lib/api';

type EditorMode = 'edit' | 'quick-edit' | 'preview';

// [2025-01-27 15:35:00] Layer information interface
export interface LayerInfo {
  id: string;
  type: 'textbox' | 'image' | 'rect' | 'circle' | 'path' | 'group' | 'i-text' | 'text';
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

// [2025-01-27 21:00:00] 多视图支持：front/back/sleeve
type DesignView = 'front' | 'back' | 'sleeve';

interface DesignLabState {
  draft?: DesignDraft;
  canvas: DesignCanvasSnapshot;
  // [2025-01-27 21:00:00] 多视图画布状态
  viewCanvases: Record<DesignView, DesignCanvasSnapshot>;
  currentView: DesignView;
  history: DesignCanvasSnapshot[];
  future: DesignCanvasSnapshot[];
  mode: EditorMode;
  mobileLocked: boolean;
  layers: LayerInfo[];
  setDraft: (draft: DesignDraft) => void;
  patchDraft: (changes: Partial<DesignDraft>) => void;
  setCanvas: (snapshot: DesignCanvasSnapshot, options?: { pushHistory?: boolean }) => void;
  setView: (view: DesignView) => void; // [2025-01-27 21:00:00] 切换视图
  getCurrentViewCanvas: () => DesignCanvasSnapshot; // [2025-01-27 21:00:00] 获取当前视图画布
  undo: () => void;
  redo: () => void;
  setMode: (mode: EditorMode) => void;
  setMobileLocked: (locked: boolean) => void;
  updateLayers: (layers: LayerInfo[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  moveLayer: (layerId: string, newIndex: number) => void;
  setViewCanvases: (viewCanvases: Record<DesignView, DesignCanvasSnapshot>) => void; // [2025-12-19 16:30:00] 批量更新所有视图画布
}

const defaultSnapshot: DesignCanvasSnapshot = {
  size: { width: 500, height: 600 },
  objects: [],
  // [2025-11-14 01:10:00] version 字段不在 DesignCanvasSnapshot 类型中，移除
};

export const useDesignLabStore = create<DesignLabState>()(
  immer((set, get) => ({
    draft: undefined,
    canvas: defaultSnapshot,
    // [2025-01-27 21:00:00] 初始化多视图画布
    viewCanvases: {
      front: defaultSnapshot,
      back: { ...defaultSnapshot, objects: [] },
      sleeve: { ...defaultSnapshot, size: { width: 200, height: 600 }, objects: [] }, // 袖子区域较小
    },
    currentView: 'front',
    history: [],
    future: [],
    mode: 'edit',
    mobileLocked: false,
    layers: [],
    setDraft: (draft: DesignDraft) =>
      set((state) => {
        state.draft = draft;
        state.canvas = draft.canvasSnapshot || defaultSnapshot;
        // [2025-01-27 21:00:00] 初始化所有视图为同一画布（如果只有单一视图数据）
        state.viewCanvases.front = draft.canvasSnapshot || defaultSnapshot;
        state.viewCanvases.back = { ...defaultSnapshot, objects: [] };
        state.viewCanvases.sleeve = { ...defaultSnapshot, size: { width: 200, height: 600 }, objects: [] };
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
          // [2025-01-27 21:00:00] 保存当前视图的画布到历史
          const currentViewCanvas = state.viewCanvases[state.currentView];
          state.history.push(currentViewCanvas);
          if (state.history.length > 20) {
            state.history.shift();
          }
        }
        state.canvas = snapshot;
        // [2025-01-27 21:00:00] 同时更新当前视图的画布
        state.viewCanvases[state.currentView] = snapshot;
        state.future = [];
      }),
    // [2025-01-27 21:00:00] 切换视图
    setView: (view: DesignView) =>
      set((state) => {
        // 保存当前视图的画布
        state.viewCanvases[state.currentView] = state.canvas;
        // 切换到新视图并加载对应的画布
        state.currentView = view;
        state.canvas = state.viewCanvases[view];
      }),
    // [2025-01-27 21:00:00] 获取当前视图的画布
    getCurrentViewCanvas: () => {
      const state = get();
      return state.viewCanvases[state.currentView];
    },
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
    // [2025-01-27 15:35:00] Layer management methods
    updateLayers: (layers: LayerInfo[]) =>
      set((state) => {
        state.layers = layers;
      }),
    toggleLayerVisibility: (layerId: string) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.visible = !layer.visible;
        }
      }),
    toggleLayerLock: (layerId: string) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.locked = !layer.locked;
        }
      }),
    bringToFront: (layerId: string) =>
      set((state) => {
        const layerIndex = state.layers.findIndex((l) => l.id === layerId);
        if (layerIndex !== -1) {
          const layer = state.layers[layerIndex];
          state.layers.splice(layerIndex, 1);
          state.layers.push(layer);
          // Update zIndex
          state.layers.forEach((l, index) => {
            l.zIndex = index;
          });
        }
      }),
    sendToBack: (layerId: string) =>
      set((state) => {
        const layerIndex = state.layers.findIndex((l) => l.id === layerId);
        if (layerIndex !== -1) {
          const layer = state.layers[layerIndex];
          state.layers.splice(layerIndex, 1);
          state.layers.unshift(layer);
          // Update zIndex
          state.layers.forEach((l, index) => {
            l.zIndex = index;
          });
        }
      }),
      moveLayer: (layerId: string, newIndex: number) =>
      set((state) => {
        const layerIndex = state.layers.findIndex((l) => l.id === layerId);
        if (layerIndex !== -1 && newIndex >= 0 && newIndex < state.layers.length) {
          const layer = state.layers[layerIndex];
          state.layers.splice(layerIndex, 1);
          state.layers.splice(newIndex, 0, layer);
          // Update zIndex
          state.layers.forEach((l, index) => {
            l.zIndex = index;
          });
        }
      }),
    // [2025-12-19 16:30:00] 批量更新所有视图画布（用于恢复本地草稿）
    setViewCanvases: (viewCanvases: Record<DesignView, DesignCanvasSnapshot>) =>
      set((state) => {
        state.viewCanvases = viewCanvases;
        // 同时更新当前视图的canvas
        state.canvas = viewCanvases[state.currentView];
      }),
  }))
);


