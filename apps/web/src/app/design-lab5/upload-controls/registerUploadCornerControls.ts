/**
 * Design Lab 5.1 - 通用角控件注册模块
* 初始实现：抽象上传/文字/艺术对象通用角控件（删除 / 复制 / 缩放）
 *
 * 注意：
 * - 只作用于前景对象（upload / text / art），不会修改商品底图（layerType === 'product' 或 name === 'background'）
 */

import * as fabric from 'fabric';
import { drawControlButton, type IconName } from './icons';

export interface CornerControlsOptions {
  /** 控件整体尺寸（像素），将映射到 Fabric 控件的 sizeX/sizeY */
  controlSize?: number;
  /** 按钮背景色 */
  buttonBackground?: string;
  /** 按钮边框色 */
  buttonBorder?: string;
  /** 按钮边框宽度 */
  buttonBorderWidth?: number;
  /** 删除按钮图标颜色 */
  deleteIconColor?: string;
  /** 复制按钮图标颜色 */
  copyIconColor?: string;
  /** 缩放按钮图标颜色 */
  resizeIconColor?: string;
  /** 删除对象时的回调（用于保存历史记录等） */
  onObjectDeleted?: (target: fabric.Object, canvas: fabric.Canvas) => void;
  /** 对象被修改时的回调（用于保存历史记录等） */
  onObjectModified?: (target: fabric.Object, canvas: fabric.Canvas) => void;
}

interface RegisteredCornerControls {
  applyCornerControlsToObject: (obj: fabric.Object) => void;
}

// 使用 WeakMap 以 Canvas 为 key 存储注册结果，避免内存泄漏
const registeredForCanvas = new WeakMap<fabric.Canvas, RegisteredCornerControls>();

/**
 * 创建一个圆形按钮控件
* 内部工具：统一配置位置/尺寸/渲染/鼠标拦截
 */
function createCircleControl(params: {
  fabricModule: typeof fabric;
  icon: IconName;
  position: { x: number; y: number };
  offsets: { offsetX: number; offsetY: number };
  size: number;
  colors: {
    background: string;
    border: string;
    borderWidth: number;
    iconColor: string;
  };
  /** 点击行为（删除/复制），返回 true 表示已处理 */
  onClick?: (target: fabric.Object, canvas: fabric.Canvas) => boolean;
  /** 拖拽行为（缩放），委托给 fabric.controlsUtils.scalingEqually 等 */
  onDrag?: (eventData: MouseEvent, transformData: any, x: number, y: number) => boolean;
}): fabric.Control {
  const { fabricModule, icon, position, offsets, size, colors, onClick, onDrag } = params;

  const ControlCtor = (fabricModule as any).Control || (fabricModule as any).control?.Control;
  if (!ControlCtor) {
    throw new Error('[CornerControls] fabric.Control is not available');
  }

  const control = new ControlCtor({
    x: position.x,
    y: position.y,
    offsetX: offsets.offsetX,
    offsetY: offsets.offsetY,
    cursorStyle: 'pointer',
    sizeX: size,
    sizeY: size,
touchCornerSize: size, // Fix: Ensure touch hit area matches visual size (160px)
transparentCorners: false, // Fix: Ensure corners are treated as opaque for hit detection
// 防止点击控件时取消选中
    mouseDownHandler: () => true,
    render: function (
      this: fabric.Control,
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride: any,
      _target: fabric.Object,
    ) {
      const renderSize = (this.sizeX ?? (size as any)) as number;
      drawControlButton(ctx, left, top, renderSize, {
        background: colors.background,
        border: colors.border,
        borderWidth: colors.borderWidth,
        iconColor: colors.iconColor,
        icon,
      });
    },
  } as fabric.Control);

  if (onClick) {
    (control as any).mouseUpHandler = (eventData: MouseEvent, transformData: any, x: number, y: number) => {
      const target = transformData?.target as fabric.Object | undefined;
      const canvas = target?.canvas as fabric.Canvas | undefined;
      if (!target || !canvas) return false;
      return onClick(target, canvas);
    };
  }

  if (onDrag) {
    (control as any).actionHandler = (eventData: MouseEvent, transformData: any, x: number, y: number) => {
      return onDrag(eventData, transformData, x, y);
    };
  }

  return control;
}

/**
 * 注册通用角控件（删除 / 复制 / 缩放）
* 可通过 matcher 控制哪些对象启用控件（upload / text / art）
 */
export function registerCornerControls(params: {
  fabric: typeof fabric;
  canvas: fabric.Canvas;
  matcher: (obj: fabric.Object) => boolean;
  options?: CornerControlsOptions;
}): RegisteredCornerControls {
  const { fabric: fabricModule, canvas, matcher, options } = params;

  const controlSize = options?.controlSize ?? 160;
  const buttonBackground = options?.buttonBackground ?? '#ffffff';
  const buttonBorder = options?.buttonBorder ?? '#e5e7eb';
  const buttonBorderWidth = options?.buttonBorderWidth ?? 3;
  const deleteIconColor = options?.deleteIconColor ?? '#ef4444';
  const copyIconColor = options?.copyIconColor ?? '#2563eb';
  const resizeIconColor = options?.resizeIconColor ?? '#2563eb';
  const onObjectDeleted = options?.onObjectDeleted;
  const onObjectModified = options?.onObjectModified;

  // 统一的偏移（让控件刚好落在对象外侧）
  const half = controlSize * 0.5;

  // 删除：左上角
  const deleteControl = createCircleControl({
    fabricModule,
    icon: 'trash',
    position: { x: -0.5, y: -0.5 },
    offsets: { offsetX: -half, offsetY: -half },
    size: controlSize,
    colors: {
      background: buttonBackground,
      border: buttonBorder,
      borderWidth: buttonBorderWidth,
      iconColor: deleteIconColor,
    },
    onClick: (target, canvas) => {
      canvas.remove(target);
      canvas.discardActiveObject();
      canvas.renderAll();
      onObjectDeleted?.(target, canvas);
      return true; // 阻止事件冒泡
    },
  });

  // 复制：右上角
  const copyControl = createCircleControl({
    fabricModule,
    icon: 'copy',
    position: { x: 0.5, y: -0.5 },
    offsets: { offsetX: half, offsetY: -half },
    size: controlSize,
    colors: {
      background: buttonBackground,
      border: buttonBorder,
      borderWidth: buttonBorderWidth,
      iconColor: copyIconColor,
    },
    onClick: (target, canvas) => {
      target.clone((cloned: fabric.Object) => {
        if (!cloned) return;
        cloned.set({
          left: (target.left || 0) + 20,
          top: (target.top || 0) + 20,
          evented: true,
        });

        if (cloned.type === 'activeSelection') {
          cloned.canvas = canvas;
          cloned.forEachObject((obj) => {
            canvas.add(obj);
          });
          cloned.setCoords();
        } else {
          canvas.add(cloned);
        }

        // 确保新对象也有控件
        if (matcher(cloned)) {
          // Apply controls recursively
          // Note: we can't call applyCornerControlsToObject here directly because it's not defined yet inside this scope in a clean way
          // unless we assume it's attached to the result.
          // However, simply triggering selection or added event usually handles it.
          // Or we can rely on external caller.

          // Better approach: ensure the cloned object gets controls via the canvas event listener or explicit call
          // Since we have 'object:added' listener, adding to canvas should trigger it!
        }

        // 选中新对象
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
        // 触发修改回调
        onObjectModified?.(cloned, canvas);
      });
      return true;
    },
  });

  // 缩放：右下角
  const resizeControl = createCircleControl({
    fabricModule,
    icon: 'resize',
    position: { x: 0.5, y: 0.5 },
    offsets: { offsetX: half, offsetY: half },
    size: controlSize,
    colors: {
      background: buttonBackground,
      border: buttonBorder,
      borderWidth: buttonBorderWidth,
      iconColor: resizeIconColor,
    },
    onDrag: (eventData, transformData, x, y) => {
      const controlsUtils = (fabricModule as any).controlsUtils;
      if (controlsUtils && controlsUtils.scalingEqually) {
        const result = controlsUtils.scalingEqually(eventData, transformData, x, y);
        // 确保 render 能够跟上
        const target = transformData.target;
        if (target) {
          target.setCoords(); // Fix: Update coords immediately
        }
        return result;
      }
      return false;
    },
  });

  // 封装应用函数
  const applyCornerControlsToObject = (obj: fabric.Object) => {
    // 1. 检查是否匹配
    if (!matcher(obj)) return;

    // 2. 检查是否已有（避免重复设置）
    // 简单检查：看是否有 deleteControl
    if ((obj.controls as any).deleteControl) return;

    // 3. 应用控件
    // 保留默认的旋转控件（mtr），覆盖其他 corner
    const defaults = fabricModule.Object.prototype.controls;

    obj.controls = {
      ...defaults,
      // 移除默认的缩放/拉伸点
      tl: new fabricModule.Control({ visible: false }),
      tr: new fabricModule.Control({ visible: false }),
      bl: new fabricModule.Control({ visible: false }),
      br: new fabricModule.Control({ visible: false }),
      ml: new fabricModule.Control({ visible: false }),
      mr: new fabricModule.Control({ visible: false }),
      mb: new fabricModule.Control({ visible: false }),
      mt: new fabricModule.Control({ visible: false }),

      // 添加自定义控件
      deleteControl,
      copyControl,
      resizeControl,
    };

    // 强制设置属性
    obj.set({
      transparentCorners: false,
      cornerColor: 'transparent',
      cornerStrokeColor: 'transparent',
      borderColor: '#2563eb', // 选中框颜色
      borderDashArray: [4, 4],
      padding: 5,
    });
  };

  // 监听添加事件
  const onObjectAdded = (e: any) => {
    if (e.target) applyCornerControlsToObject(e.target);
  };

  // 监听选中事件（作为兜底）
  const onSelectionCreated = (e: any) => {
    const selected = e.selected || [];
    selected.forEach((obj: fabric.Object) => applyCornerControlsToObject(obj));
  };

  // 注册监听器
  canvas.on('object:added', onObjectAdded);
  canvas.on('selection:created', onSelectionCreated);

  // 对现有对象应用
  canvas.getObjects().forEach(applyCornerControlsToObject);

  // 缓存注册结果
  const result = { applyCornerControlsToObject };
  registeredForCanvas.set(canvas, result);

  return result;
}

// ------------------------------------------------------------------
// Universal Controls for Layout (Upload / Text / Art)
// ------------------------------------------------------------------

/**
 * 注册通用角控件（Delete / Copy / Resize）
 * 适用于：Upload (Image), Text (IText), Art (Image)
 */
export function registerUniversalCornerControls(canvas: fabric.Canvas, fabricModule: typeof fabric, options?: CornerControlsOptions) {
  if (!canvas || !fabricModule) return;

  // 如果已经注册过，直接返回
  if (registeredForCanvas.has(canvas)) {
    return registeredForCanvas.get(canvas);
  }

  return registerCornerControls({
    fabric: fabricModule,
    canvas,
    matcher: (obj) => {
      if (!obj) return false;
      // 排除背景
      if (obj.name === 'background' || obj.name?.startsWith('product-image-')) return false;
      const layerType = (obj as any).data?.layerType;
      if (layerType === 'product' || layerType === 'product-image' || layerType === 'product-image-base') return false;

      // 包含：image (upload/art), i-text/textbox (text)
      return obj.type === 'image' || obj.type === 'i-text' || obj.type === 'textbox';
    },
    options
  });
}

/**
 * 手动对单个对象应用通用角控件
 */
export function applyCornerControls(params: { canvas: fabric.Canvas; obj: fabric.Object }) {
  const { canvas, obj } = params;
  const registered = registeredForCanvas.get(canvas);
  if (registered) {
    registered.applyCornerControlsToObject(obj);
  } else {
    // Auto-register if not yet done? 
    // For now, assume registerUniversalCornerControls is called once at init.
  }
}

// 保持向后兼容
export const applyUploadCornerControlsToObject = applyCornerControls;
