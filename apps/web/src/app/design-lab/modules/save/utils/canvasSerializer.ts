/**
 * Canvas Serializer - 画布序列化工具
* 从 Fabric.js canvas 序列化设计数据
 */
import type { fabric } from 'fabric';

export interface DesignCanvasSnapshot {
  size: {
    width: number;
    height: number;
  };
  objects: any[];
}

/**
 * 将 Fabric.js canvas 转换为快照
* 序列化画布数据，排除背景图
 */
export function canvasToSnapshot(
  canvas: fabric.Canvas,
  canvasWidth: number = 4000,
  canvasHeight: number = 4800
): DesignCanvasSnapshot {
  // 过滤掉背景图和其他系统对象
  const objects = canvas
    .getObjects()
    .filter((obj: fabric.Object) => {
      // 排除背景图、产品图片等系统对象
      const objName = (obj as any).name;
      return (
        objName !== 'background' &&
        objName !== 'product-image-base' &&
        objName !== 'product-image'
      );
    })
    .map((obj: fabric.Object) => {
      // 序列化对象，保留自定义属性
      return obj.toJSON(['name', 'data']);
    });

  return {
    size: {
      width: canvas.width || canvasWidth,
      height: canvas.height || canvasHeight,
    },
    objects,
  };
}

/**
 * 从快照恢复 Fabric.js canvas
* 反序列化画布数据
 */
export async function snapshotToCanvas(
  snapshot: DesignCanvasSnapshot,
  canvas: fabric.Canvas,
  fabricLib: typeof fabric
): Promise<void> {
  // 清空画布（保留背景图）
  const backgroundObjects = canvas
    .getObjects()
    .filter((obj: fabric.Object) => {
      const objName = (obj as any).name;
      return objName === 'background' || objName === 'product-image-base' || objName === 'product-image';
    });

  canvas.clear();

  // 恢复背景对象
  backgroundObjects.forEach((obj) => {
    canvas.add(obj);
  });

  // 恢复快照中的对象
  if (snapshot.objects && snapshot.objects.length > 0) {
    const restoredObjects = await Promise.all(
      snapshot.objects.map(async (objData) => {
        try {
          return await fabricLib.Object.fromObject(objData);
        } catch (error) {
          console.warn('[CanvasSerializer] Failed to restore object:', error);
          return null;
        }
      })
    );

    restoredObjects.forEach((obj) => {
      if (obj) {
        canvas.add(obj);
      }
    });
  }

  canvas.renderAll();
}

