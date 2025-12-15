/**
 * Upload Corner Controls (Fabric.js)
 * [2025-12-15 16:05:00] Design Lab 5.1: 从零实现上传图片选中框三角按钮（删除/复制/等比缩放）
 *
 * 设计目标：
 * - 仅对 data.layerType === 'upload' 的 Fabric.Image 启用
 * - 不复用现有 Design Lab 控件逻辑（例如旧 deleteControl），避免耦合
 * - 对外仅暴露 register + apply 两个 API
 */

import type { fabric } from 'fabric';
import { drawControlButton, type IconName } from './icons';

export type UploadCornerControlsOptions = {
  /** 控件按钮尺寸（像素） */
  controlSize?: number;
  /** 选中框边框颜色 */
  borderColor?: string;
  /** 按钮背景 */
  buttonBackground?: string;
  /** 按钮边框 */
  buttonBorder?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 删除回调（可选） */
  onDelete?: (obj: fabric.Object) => void;
  /** 复制回调（可选） */
  onDuplicate?: (payload: { source: fabric.Object; clone: fabric.Object }) => void;
};

type Registered = {
  applyUploadCornerControlsToObject: (obj: fabric.Object) => void;
};

let registeredForCanvas = new WeakMap<fabric.Canvas, Registered>();

function isUploadImage(obj: fabric.Object | undefined | null): obj is fabric.Image {
  if (!obj) return false;
  const anyObj = obj as any;
  return obj.type === 'image' && anyObj.data?.layerType === 'upload';
}

function renderButton(
  icon: IconName,
  opts: Required<Pick<UploadCornerControlsOptions, 'controlSize' | 'buttonBackground' | 'buttonBorder' | 'iconColor'>>,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number
): void {
  drawControlButton(ctx, left, top, opts.controlSize, {
    background: opts.buttonBackground,
    border: opts.buttonBorder,
    borderWidth: 2,
    iconColor: opts.iconColor,
    icon,
  });
}

export function registerUploadCornerControls(params: {
  fabric: typeof fabric;
  canvas: fabric.Canvas;
  options?: UploadCornerControlsOptions;
}): Registered {
  const { fabric: fabricMod, canvas, options } = params;

  const existing = registeredForCanvas.get(canvas);
  if (existing) return existing;

  const opts = {
    controlSize: options?.controlSize ?? 28,
    borderColor: options?.borderColor ?? '#BDBDBD',
    buttonBackground: options?.buttonBackground ?? '#FFFFFF',
    buttonBorder: options?.buttonBorder ?? '#BDBDBD',
    iconColor: options?.iconColor ?? '#4B5563',
  };

  // Delete (Top-Left)
  const deleteControl = new fabricMod.Control({
    x: -0.5,
    y: -0.5,
    offsetX: -opts.controlSize * 0.15,
    offsetY: -opts.controlSize * 0.15,
    cursorStyle: 'pointer',
    // [2025-12-15 16:05:00] 删除上传图片
    mouseUpHandler: (_eventData: any, transform: any) => {
      const target = transform?.target as fabric.Object | undefined;
      if (!target) return true;
      if (!isUploadImage(target)) return true;

      try {
        canvas.remove(target);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        options?.onDelete?.(target);
      } catch (e) {
        console.error('[UploadCornerControls] delete failed', e);
      }
      return true;
    },
    render: (ctx, left, top) => renderButton('trash', opts, ctx, left, top),
  });

  // Duplicate (Bottom-Left)
  const duplicateControl = new fabricMod.Control({
    x: -0.5,
    y: 0.5,
    offsetX: -opts.controlSize * 0.15,
    offsetY: opts.controlSize * 0.15,
    cursorStyle: 'pointer',
    // [2025-12-15 16:05:00] 复制上传图片
    mouseUpHandler: (_eventData: any, transform: any) => {
      const target = transform?.target as fabric.Object | undefined;
      if (!target) return true;
      if (!isUploadImage(target)) return true;

      try {
        target.clone((cloned: fabric.Object) => {
          try {
            const anyClone = cloned as any;
            anyClone.data = { ...(anyClone.data || {}), layerType: 'upload' };

            cloned.set({
              left: (target.left ?? 0) + 20,
              top: (target.top ?? 0) + 20,
            });

            // 复制后也应用三按钮控件
            applyUploadCornerControlsToObject(cloned);

            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.requestRenderAll();

            options?.onDuplicate?.({ source: target, clone: cloned });
          } catch (e) {
            console.error('[UploadCornerControls] duplicate inner failed', e);
          }
        });
      } catch (e) {
        console.error('[UploadCornerControls] duplicate failed', e);
      }
      return true;
    },
    render: (ctx, left, top) => renderButton('copy', opts, ctx, left, top),
  });

  // Resize (Bottom-Right) - keep aspect ratio
  const resizeControl = new fabricMod.Control({
    x: 0.5,
    y: 0.5,
    offsetX: opts.controlSize * 0.15,
    offsetY: opts.controlSize * 0.15,
    cursorStyleHandler: (eventData: any, control: any, fabricObject: any) => {
      // [2025-12-15 16:05:00] 使用 Fabric 默认缩放光标策略（等比缩放）
      return (fabricMod.controlsUtils as any)?.scaleCursorStyleHandler?.(eventData, control, fabricObject) || 'nwse-resize';
    },
    actionHandler: (eventData: any, transform: any, x: number, y: number) => {
      const target = transform?.target as fabric.Object | undefined;
      if (!target) return false;
      if (!isUploadImage(target)) return false;

      // [2025-12-15 16:05:00] 调用 Fabric 官方等比缩放 handler
      const scalingEqually = (fabricMod.controlsUtils as any)?.scalingEqually;
      if (typeof scalingEqually === 'function') {
        return scalingEqually(eventData, transform, x, y);
      }

      // fallback：如果 controlsUtils 不存在（极少），则拒绝本次缩放，避免异常
      return false;
    },
    render: (ctx, left, top) => renderButton('resize', opts, ctx, left, top),
  });

  function applyUploadCornerControlsToObject(obj: fabric.Object): void {
    if (!isUploadImage(obj)) return;

    // [2025-12-15 16:05:00] 设置选中框样式（灰边框）
    obj.set({
      borderColor: opts.borderColor,
      cornerColor: opts.buttonBackground,
      cornerStrokeColor: opts.buttonBorder,
      transparentCorners: false,
      borderScaleFactor: 2,
      cornerStyle: 'circle',
      cornerSize: opts.controlSize,
      hasRotatingPoint: false,
    } as any);

    // [2025-12-15 16:05:00] 仅保留三个控件，避免与其他默认控件/旧控件冲突
    (obj as any).controls = {
      uploadDelete: deleteControl,
      uploadDuplicate: duplicateControl,
      uploadResize: resizeControl,
    };

    // [2025-12-15 16:05:00] 关闭 Fabric 默认控制点的可见性（防止渲染/交互残留）
    if (typeof (obj as any).setControlsVisibility === 'function') {
      (obj as any).setControlsVisibility({
        tl: false,
        tr: false,
        bl: false,
        br: false,
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        mtr: false,
      });
    }
  }

  // [2025-12-15 16:05:00] 自动在选中更新/对象新增时对 upload 图片应用控件（最小侵入）
  const onSelectionUpdate = (e: any) => {
    const target = e?.selected?.[0] || e?.target;
    if (target && isUploadImage(target)) {
      applyUploadCornerControlsToObject(target);
      canvas.requestRenderAll();
    }
  };

  const onObjectAdded = (e: any) => {
    const target = e?.target as fabric.Object | undefined;
    if (target && isUploadImage(target)) {
      applyUploadCornerControlsToObject(target);
    }
  };

  canvas.on('selection:created', onSelectionUpdate);
  canvas.on('selection:updated', onSelectionUpdate);
  canvas.on('object:added', onObjectAdded);

  const registered: Registered = { applyUploadCornerControlsToObject };
  registeredForCanvas.set(canvas, registered);
  return registered;
}

export function applyUploadCornerControlsToObject(params: {
  canvas: fabric.Canvas;
  obj: fabric.Object;
}): void {
  const reg = registeredForCanvas.get(params.canvas);
  if (!reg) {
    console.warn('[UploadCornerControls] apply called before register; skipping');
    return;
  }
  reg.applyUploadCornerControlsToObject(params.obj);
}
