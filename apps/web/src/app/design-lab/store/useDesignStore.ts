import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { DesignDocument, Layer, ViewId, ViewState, LayerType } from '@/types/design-lab';
import { saveToLocal } from './persistence';

interface DesignState {
    document: DesignDocument | null;
    isLoading: boolean;
    isSaving: boolean;
    dirty: boolean;

    // Actions
    initializeDesign: (productId: string, variantId?: string, initialData?: Partial<DesignDocument>) => void;
    setActiveView: (viewId: ViewId) => void;

    // Layer Management
    addLayer: (viewId: ViewId, layer: Layer) => void;
    updateLayer: (viewId: ViewId, layerId: string, patch: Partial<Layer>) => void;
    removeLayer: (viewId: ViewId, layerId: string) => void;
    setViewLayers: (viewId: ViewId, layers: Layer[]) => void;

    // Canvas/View Management
    updateViewConstraints: (viewId: ViewId, constraints: ViewState['constraints']) => void;

    // Persistence stubs (to be connected later)
    saveDesign: () => Promise<void>;
}

const DEFAULT_CANVAS_SIZE = { width: 1200, height: 1440 };

const createEmptyView = (viewId: ViewId): ViewState => ({
    viewId,
    layers: [],
    canvasSize: DEFAULT_CANVAS_SIZE,
});

export const useDesignStore = create<DesignState>()(
    immer((set, get) => ({
        document: null,
        isLoading: false,
        isSaving: false,
        dirty: false,

        initializeDesign: (productId, variantId, initialData) => {
            const docId = initialData?.docId || uuidv4();
            const now = new Date().toISOString();

            const newDoc: DesignDocument = {
                docId,
                productId,
                variantId,
                createdAt: now,
                updatedAt: now,
                version: 1,
                activeView: 'front',
                views: {
                    'front': createEmptyView('front'),
                    'back': createEmptyView('back'),
                    'left-sleeve': createEmptyView('left-sleeve'),
                    'right-sleeve': createEmptyView('right-sleeve'),
                    'sleeve': createEmptyView('sleeve'),
                },
                ...initialData,
            };

            set((state) => {
                state.document = newDoc;
                state.dirty = false;
                state.isLoading = false;
            });
        },

        setActiveView: (viewId) => {
            set((state) => {
                if (state.document) {
                    state.document.activeView = viewId;
                    // Ensure view exists
                    if (!state.document.views[viewId]) {
                        state.document.views[viewId] = createEmptyView(viewId);
                    }
                }
            });
        },

        addLayer: (viewId, layer) => {
            set((state) => {
                if (state.document && state.document.views[viewId]) {
                    state.document.views[viewId].layers.push(layer);
                    state.document.updatedAt = new Date().toISOString();
                    state.dirty = true;
                }
            });
        },

        updateLayer: (viewId, layerId, patch) => {
            set((state) => {
                const view = state.document?.views[viewId];
                if (view) {
                    const layerIndex = view.layers.findIndex((l) => l.id === layerId);
                    if (layerIndex !== -1) {
                        // Apply patch
                        Object.assign(view.layers[layerIndex], patch);
                        if (state.document) {
                            state.document.updatedAt = new Date().toISOString();
                            state.dirty = true;
                        }
                    }
                }
            });
        },

        removeLayer: (viewId, layerId) => {
            set((state) => {
                const view = state.document?.views[viewId];
                if (view) {
                    view.layers = view.layers.filter((l) => l.id !== layerId);
                    if (state.document) {
                        state.document.updatedAt = new Date().toISOString();
                        state.dirty = true;
                    }
                }
            });
        },

        setViewLayers: (viewId, layers) => {
            set((state) => {
                const view = state.document?.views[viewId];
                if (view) {
                    view.layers = layers;
                    if (state.document) {
                        state.document.updatedAt = new Date().toISOString();
                        state.dirty = true;
                    }
                }
            });
        },

        updateViewConstraints: (viewId, constraints) => {
            set((state) => {
                const view = state.document?.views[viewId];
                if (view) {
                    view.constraints = { ...view.constraints, ...constraints };
                }
            });
        },

        saveDesign: async () => {
            set((state) => { state.isSaving = true; });
            try {
                const doc = get().document;
                if (doc) {
                    await saveToLocal(doc);
                }

                set((state) => {
                    if (state.document) state.document.version += 1;
                    state.dirty = false;
                });
            } finally {
                set((state) => { state.isSaving = false; });
            }
        },
    }))
);

