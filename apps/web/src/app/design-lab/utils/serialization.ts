import { v4 as uuidv4 } from 'uuid';
import { Layer, LayerType, LayerStyle, Transform } from '@/types/design-lab';
import * as fabric from 'fabric';

/**
 * Serialize a Fabric.js object to our canonical Layer format
 */
function serializeObject(obj: any): Layer | null {
    if (!obj) return null;
    // Skip guide objects or background images that shouldn't be serialized
    if (obj.name === 'printable-area-group' || obj.name === 'product-image-base') {
        return null;
    }

    // Identify type
    let type: LayerType = 'vector';
    if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
        type = 'text';
    } else if (obj.type === 'image') {
        type = 'image';
    } else if (obj.type === 'group') {
        type = 'group';
    }

    // Round transform values to avoid floating point drift
    const transform: Transform = {
        x: Number(obj.left?.toFixed(2)) || 0,
        y: Number(obj.top?.toFixed(2)) || 0,
        scaleX: Number(obj.scaleX?.toFixed(4)) || 1,
        scaleY: Number(obj.scaleY?.toFixed(4)) || 1,
        rotation: Number(obj.angle?.toFixed(2)) || 0,
        skewX: Number(obj.skewX?.toFixed(2)) || 0,
        skewY: Number(obj.skewY?.toFixed(2)) || 0,
        originX: obj.originX || 'left',
        originY: obj.originY || 'top',
    };

    const layer: Layer = {
        id: obj.id || uuidv4(), // Ensure stable ID
        type,
        visible: obj.visible ?? true,
        locked: !!obj.lockMovementX, // Simplified lock check
        zIndex: 0, // Will be set by array order
        transform,
    };

    if (type === 'image') {
        // For images, we need the source
        // In a real app, we'd prefer a stable uploadId, but for now use src
        const src = obj.getSrc ? obj.getSrc() : (obj._element?.src || '');
        layer.src = src;
        // CRITICAL FIX: Preserve original object name if available, otherwise fallback
        layer.name = obj.name || 'image-layer';
    }

    if (type === 'text') {
        layer.text = obj.text || '';
        layer.style = {
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fill: obj.fill as string,
            textAlign: obj.textAlign,
            opacity: obj.opacity,
        };
        layer.name = obj.name || 'text-layer';
    }

    // Preserve existing metadata if any
    if (obj.data) {
        layer.metadata = obj.data;
        // Restore ID if it was in metadata (legacy support)
        if (obj.data.id) layer.id = obj.data.id;
    }

    return layer;
}

/**
 * Serialize the entire canvas to a list of Layers
 */
export function serializeCanvas(canvas: any): Layer[] {
    if (!canvas) return [];

    const objects = canvas.getObjects();
    const layers: Layer[] = [];

    objects.forEach((obj: any) => {
        const layer = serializeObject(obj);
        if (layer) {
            layers.push(layer);
        }
    });

    return layers;
}

/**
 * Restore a single layer to the canvas
 */
async function restoreLayer(canvas: any, layer: Layer): Promise<void> {
    const { type, transform, style, src, text } = layer;

    let fabricObj: any = null;

    try {
        if (type === 'image' && src) {
            // Handle Image loading
            await new Promise<void>((resolve, reject) => {
                const imgEl = new Image();
                imgEl.crossOrigin = 'anonymous';
                imgEl.src = src;
                imgEl.onload = () => {
                    fabricObj = new fabric.Image(imgEl);
                    resolve();
                };
                imgEl.onerror = (e) => {
                    console.error('Failed to load image', src, e);
                    resolve(); // Resolve anyway to not block other layers
                };
            });
        } else if (type === 'text') {
            fabricObj = new fabric.IText(text || '', {
                fontFamily: style?.fontFamily || 'Arial',
                fontSize: style?.fontSize || 20,
                fill: style?.fill || '#000000',
                textAlign: style?.textAlign || 'left',
                opacity: style?.opacity ?? 1,
            });
        }

        if (fabricObj) {
            // Apply transforms
            fabricObj.set({
                left: transform.x,
                top: transform.y,
                scaleX: transform.scaleX,
                scaleY: transform.scaleY,
                angle: transform.rotation,
                skewX: transform.skewX,
                skewY: transform.skewY,
                originX: transform.originX || 'left',
                originY: transform.originY || 'top',
                id: layer.id, // Set the ID on the object
                name: layer.name, // CRITICAL FIX: Restore original object name
                data: layer.metadata || { id: layer.id, layerType: type }, // Restore metadata
            });

            // Add controls hook if needed (will be handled by client)
            canvas.add(fabricObj);

            // CRITICAL FIX: Re-attach custom controls (delete, duplicate, etc.)
            if (typeof (canvas as any).addIconControlsToObject === 'function') {
                (canvas as any).addIconControlsToObject(fabricObj);
            } else if (typeof (canvas as any).addCustomControlsToObject === 'function') {
                (canvas as any).addCustomControlsToObject(fabricObj);
            }

            // Ensure borders are off for Text if requested
            if (type === 'text') {
                fabricObj.set({ hasBorders: false, borderColor: 'transparent' });
            }
        }

    } catch (err) {
        console.error(`Failed to restore layer ${layer.id}`, err);
    }
}

/**
 * Apply a ViewState (list of layers) to the canvas
 */
export async function applyViewState(canvas: any, layers: Layer[]): Promise<void> {
    if (!canvas) return;

    // 1. Clear existing user objects
    const existingObjects = canvas.getObjects().filter((obj: any) => {
        // Keep background and guides
        return obj.name !== 'product-image-base' && obj.name !== 'printable-area-group';
    });

    canvas.remove(...existingObjects);

    // 2. Re-create objects in order
    for (const layer of layers) {
        await restoreLayer(canvas, layer);
    }

    canvas.requestRenderAll();
}
