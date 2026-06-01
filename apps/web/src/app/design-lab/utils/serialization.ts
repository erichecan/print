import { v4 as uuidv4 } from 'uuid';
import { Layer, LayerType, LayerStyle, Transform } from '@/types/design-lab';
import * as fabric from 'fabric';

/**
 * Serialize a Fabric.js object to our canonical Layer format
 */
function serializeObject(obj: any): Layer | null {
    if (!obj) return null;
    // Primary guard: excludeFromExport is set directly on product base images — most reliable check
    if (obj.excludeFromExport) return null;
    // Fallback guards using both obj.x and obj.get?.('x') for Fabric.js v6 compatibility
    const objName = obj.name ?? obj.get?.('name');
    const objData = obj.data ?? obj.get?.('data');
    if (
        objName === 'printable-area-group' ||
        objName === 'product-image-base' ||
        objData?.layerType === 'product-image'
    ) {
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
        const src = obj.getSrc ? obj.getSrc() : (obj._element?.src || '');
        layer.src = src;
        layer.name = objName || 'image-layer';
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
        layer.name = objName || 'text-layer';
    }

    // Preserve existing metadata if any
    if (objData) {
        layer.metadata = objData;
        if (objData.id) layer.id = objData.id;
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
            });
            // Direct assignment for Fabric.js v6: set() doesn't reliably expose custom props
            (fabricObj as any).id = layer.id;
            (fabricObj as any).name = layer.name;
            (fabricObj as any).data = layer.metadata || { id: layer.id, layerType: type };

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

    // 1. Clear existing user objects (keep background and guides)
    const existingObjects = canvas.getObjects().filter((obj: any) => {
        const n = obj.name ?? obj.get?.('name');
        const d = obj.data ?? obj.get?.('data');
        return n !== 'product-image-base' && n !== 'printable-area-group' && d?.layerType !== 'product-image';
    });

    canvas.remove(...existingObjects);

    // 2. Re-create objects in order
    for (const layer of layers) {
        await restoreLayer(canvas, layer);
    }

    canvas.requestRenderAll();
}
