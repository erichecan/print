export type ViewId = 'front' | 'back' | 'left-sleeve' | 'right-sleeve' | 'sleeve';

export type LayerType = 'image' | 'text' | 'vector' | 'group';

export interface Box {
    width: number;
    height: number;
}

export interface Transform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
    originX?: string;
    originY?: string;
}

export interface LayerStyle {
    fontFamily?: string;
    fontSize?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    textAlign?: 'left' | 'center' | 'right';
    shadow?: {
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
    };
}

export interface Layer {
    id: string; // Stable UUID
    type: LayerType;
    name?: string;

    // Asset source
    // For images: URL (or blob: URL for local previews)
    // For uploaded images, we should track the uploadId in metadata
    src?: string;

    // Text content
    text?: string;

    // Visual properties
    style?: LayerStyle;
    transform: Transform;

    // State flags
    visible: boolean;
    locked: boolean;

    // Optional metadata (e.g., upload origin, price info)
    metadata?: Record<string, unknown>;

    // Future proofing
    clipPath?: string; // ID of another layer or path string
    zIndex: number; // Explicit z-index or implicit by array order
}

export interface ViewConstraints {
    printableArea?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ViewState {
    viewId: ViewId;
    layers: Layer[];
    constraints?: ViewConstraints;
    // Dimensions of the canvas/view for this specific side
    canvasSize: { width: number; height: number };
}

export interface HistoryAction {
    type: string;
    timestamp: number;
    // Could store full snapshot or patches
    payload?: any;
}

export interface DesignDocument {
    docId: string;
    productId: string;
    variantId?: string; // Specific variant (e.g. Color)

    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    version: number;

    activeView: ViewId;
    views: Record<ViewId, ViewState>;

    // Metadata for the whole design
    name?: string;

    // Optional: Global history if we want cross-view undo/redo
    // But spec says "Maintain per-view history stacks" which implies local state or per-view history
    // integrating history into the document helps with persistence though
}
