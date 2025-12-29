/**
 * Canvas Restoration Utility
 * [2025-12-28] Restores Fabric canvas from saved snapshot
 */
import { Canvas } from 'fabric';

/**
 * Restore Fabric canvas from a JSON snapshot
 * @param canvas - The Fabric canvas instance to restore into
 * @param snapshot - The saved canvas snapshot (from canvasToSnapshot)
 * @returns Promise that resolves when restoration is complete
 */
export async function restoreCanvasFromSnapshot(
    canvas: Canvas,
    snapshot: any
): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            console.log('[canvasRestore] Starting canvas restoration...');
            console.log('[canvasRestore] Snapshot contains', snapshot?.objects?.length || 0, 'objects');
            console.log('[canvasRestore] Snapshot structure:', {
                hasObjects: !!snapshot?.objects,
                hasVersion: !!snapshot?.version,
                objectTypes: snapshot?.objects?.map((obj: any) => obj.type) || [],
                firstObject: snapshot?.objects?.[0]
            });

            // Clear existing objects
            canvas.clear();

            // Load from JSON
            canvas.loadFromJSON(snapshot, () => {
                canvas.renderAll();
                const objectCount = canvas.getObjects().length;
                console.log('[canvasRestore] ✅ Canvas restored with', objectCount, 'objects');

                // Log each object type for debugging
                canvas.getObjects().forEach((obj: any, index: number) => {
                    console.log(`[canvasRestore] Object ${index}:`, obj.type, obj.name || '(unnamed)');
                });

                if (objectCount === 0 && snapshot?.objects?.length > 0) {
                    console.error('[canvasRestore] ⚠️ WARNING: Snapshot had objects but none were restored!');
                    console.error('[canvasRestore] This suggests a Fabric.js version mismatch or incompatible data format');
                }

                resolve();
            });
        } catch (error) {
            console.error('[canvasRestore] ❌ Failed to restore canvas:', error);
            reject(error);
        }
    });
}
