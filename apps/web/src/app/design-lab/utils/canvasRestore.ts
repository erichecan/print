/**
 * Canvas Restoration Utility
* Restores Fabric canvas from saved snapshot
 */
import { Canvas } from 'fabric';

/**
 * Restore canvas from a JSON snapshot
 * @param canvas - Fabric canvas instance
 * @param snapshot - Canvas JSON snapshot
 * @returns Promise that resolves with the array of loaded objects
 */
export async function restoreCanvasFromSnapshot(
    canvas: Canvas,
    snapshot: any
): Promise<fabric.Object[]> {
    console.log('[canvasRestore] Starting canvas restoration...');

    if (!snapshot || !snapshot.objects) {
        console.warn('[canvasRestore] No snapshot or objects to restore');
        return [];
    }

    console.log('[canvasRestore] Snapshot contains', snapshot.objects.length, 'objects');
    console.log('[canvasRestore] Snapshot structure:', {
        hasObjects: !!snapshot.objects,
        hasVersion: !!snapshot.version,
        objectTypes: snapshot.objects.map((obj: any) => obj.type),
        firstObject: snapshot.objects[0]
    });

    return new Promise((resolve) => {
        canvas.loadFromJSON(snapshot, () => {
            canvas.renderAll();

            const loadedObjects = canvas.getObjects();
            console.log('[canvasRestore] ✅ Canvas restored with', loadedObjects.length, 'objects');

            // Warning if objects were in snapshot but not restored
            if (snapshot.objects.length > 0 && loadedObjects.length === 0) {
                console.error('[canvasRestore] ⚠️ WARNING: Snapshot had objects but none were restored!');
                console.error('[canvasRestore] This suggests a Fabric.js version mismatch or incompatible data format');
            }

            resolve(loadedObjects);
        });
    });
}
