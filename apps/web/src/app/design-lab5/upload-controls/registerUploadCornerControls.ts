/**
 * Design Lab 5.1 - 通用角控件注册模块
 * [2025-12-16 02:07:45] 初始实现：抽象上传/文字/艺术对象通用角控件（删除 / 复制 / 缩放）
 *
 * 注意：
 * - 只作用于前景对象（upload / text / art），不会修改商品底图（layerType === 'product' 或 name === 'background'）
 */

import type { fabric } from 'fabric';
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

// [2025-12-16 02:07:45] 使用 WeakMap 以 Canvas 为 key 存储注册结果，避免内存泄漏
const registeredForCanvas = new WeakMap<fabric.Canvas, RegisteredCornerControls>();

/**
 * 创建一个圆形按钮控件
 * [2025-12-16 02:07:45] 内部工具：统一配置位置/尺寸/渲染/鼠标拦截
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
    touchCornerSize: size, // [2025-12-21] Fix: Ensure touch hit area matches visual size (160px)
    transparentCorners: false, // [2025-12-21] Fix: Ensure corners are treated as opaque for hit detection
    // [2025-12-16 02:07:45] 防止点击控件时取消选中
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
 * [2025-12-16 02:07:45] 可通过 matcher 控制哪些对象启用控件（upload / text / art）
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
    onClick: (target, targetCanvas) => {
      const name = (target as any).name || 'unnamed';
      const layerType = (target as any).data?.layerType;
      console.log('[CornerControls] 🗑️ delete clicked:', { name, layerType });

      // [2025-12-16 02:57:00] 删除前触发回调（保存删除前的快照用于 Undo）
      if (onObjectDeleted) {
        onObjectDeleted(target, targetCanvas);
      }

      // 执行删除
      targetCanvas.remove(target);
      targetCanvas.discardActiveObject();
      targetCanvas.requestRenderAll();

      // [2025-12-16 02:57:00] 删除后再次触发回调（保存删除后的状态）
      if (onObjectDeleted) {
        // 注意：此时 target 已被移除，但回调仍会保存当前 canvas 状态
        onObjectDeleted(target, targetCanvas);
      }

      return true;
    },
  });

  // 缩放：右下角（等比缩放）
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
      if (controlsUtils && typeof controlsUtils.scalingEqually === 'function') {
        const result = controlsUtils.scalingEqually(eventData, transformData, x, y);
        // [2025-12-16 03:52:00] 缩放操作中实时更新坐标，确保控件位置正确
        if (transformData?.target) {
          transformData.target.setCoords();
        }
        return result;
      }
      // [2025-12-16 02:07:45] graceful fallback：如果没有 controlsUtils，保持现状，不报错
      return false;
    },
  });

  // 复制：左下角（需要在 resizeControl 之后定义，因为回调中会引用它）
  const duplicateControl = createCircleControl({
    fabricModule,
    icon: 'copy',
    position: { x: -0.5, y: 0.5 },
    offsets: { offsetX: -half, offsetY: half },
    size: controlSize,
    colors: {
      background: buttonBackground,
      border: buttonBorder,
      borderWidth: buttonBorderWidth,
      iconColor: copyIconColor,
    },
    onClick: (target, targetCanvas) => {
      const name = (target as any).name || 'unnamed';
      const layerType = (target as any).data?.layerType;
      console.log('[CornerControls] 📄 duplicate clicked:', { name, layerType });

      if (typeof (target as any).clone !== 'function') {
        return false;
      }

      (target as any).clone((cloned: fabric.Object) => {
        cloned.set({
          left: (target.left || 0) + 40,
          top: (target.top || 0) + 40,
        });

        // 复制自定义数据（包括 layerType）
        (cloned as any).data = { ...(target as any).data };

        // [2025-12-16 02:55:00] 使用闭包中的 controls 来应用角控件
        applyCornerControlsToObjectInternal(cloned, {
          matcher,
          deleteControl,
          duplicateControl,
          resizeControl,
        });

        targetCanvas.add(cloned);
        targetCanvas.setActiveObject(cloned);
        targetCanvas.requestRenderAll();

        // [2025-12-16 02:59:00] 复制后触发修改回调（保存历史记录）
        if (onObjectModified) {
          onObjectModified(cloned, targetCanvas);
        }
      });

      return true;
    },
  });

  const registered: RegisteredCornerControls = {
    applyCornerControlsToObject: (obj: fabric.Object) => {
      applyCornerControlsToObjectInternal(obj, {
        matcher,
        deleteControl,
        duplicateControl,
        resizeControl,
      });
    },
  };

  registeredForCanvas.set(canvas, registered);

  // 监听 selection 与对象添加事件，自动为匹配对象挂角控件
  canvas.on('selection:created', (e: any) => {
    const target = e?.selected?.[0] as fabric.Object | undefined;
    if (target) {
      registered.applyCornerControlsToObject(target);
      canvas.requestRenderAll();
    }
  });

  canvas.on('selection:updated', (e: any) => {
    const target = e?.selected?.[0] as fabric.Object | undefined;
    if (target) {
      registered.applyCornerControlsToObject(target);
      canvas.requestRenderAll();
    }
  });

  canvas.on('object:added', (e: any) => {
    const target = e?.target as fabric.Object | undefined;
    if (target) {
      registered.applyCornerControlsToObject(target);
    }
  });

  // [2025-12-16 03:50:00] 监听对象修改事件，确保修改后控件仍然可用
  // 当对象被缩放、移动、旋转后，需要重新应用控件并更新坐标
  canvas.on('object:modified', (e: any) => {
    const target = e?.target as fabric.Object | undefined;
    if (target && matcher(target)) {
      const name = (target as any).name || 'unnamed';
      console.log('[CornerControls] 🔄 对象已修改，重新应用角控件:', { name });

      // 重新应用角控件（确保控件引用仍然有效）
      registered.applyCornerControlsToObject(target);
      // 更新对象坐标（确保控件位置正确）
      target.setCoords();
      canvas.requestRenderAll();
    }
  });

  // [2025-12-16 03:50:00] 监听对象移动事件，实时更新控件位置
  canvas.on('object:moving', (e: any) => {
    const target = e?.target as fabric.Object | undefined;
    if (target && matcher(target)) {
      // 移动时更新坐标，确保控件跟随对象
      target.setCoords();
    }
  });

  // [2025-12-16 03:50:00] 监听对象缩放事件（通过拖拽控件缩放时）
  canvas.on('object:scaling', (e: any) => {
    const target = e?.target as fabric.Object | undefined;
    if (target && matcher(target)) {
      // 缩放时更新坐标，确保控件位置正确
      target.setCoords();
    }
  });

  return registered;
}

/**
 * 内部工具：为对象挂上角控件并隐藏默认控件
 * [2025-12-16 02:07:45] 只在 matcher 返回 true 时生效
 */
function applyCornerControlsToObjectInternal(
  obj: fabric.Object,
  controls: {
    matcher: (obj: fabric.Object) => boolean;
    deleteControl: fabric.Control;
    duplicateControl: fabric.Control;
    resizeControl: fabric.Control;
  },
): void {
  const { matcher, deleteControl, duplicateControl, resizeControl } = controls;

  if (!matcher(obj)) {
    return;
  }

  const layerType = (obj as any).data?.layerType;
  const name = (obj as any).name || 'unnamed';

  // 保护商品底图：不对 layerType === 'product' 或名称为 background 的对象挂控件
  if (layerType === 'product' || name === 'background') {
    return;
  }

  // [2025-12-16 03:30:00] 确保控件和边框可见
  obj.set({
    hasControls: true, // 必须设置为 true，否则自定义控件不会显示
    hasBorders: true, // 必须设置为 true，否则边框不会显示
    borderColor: '#808080', // 灰色边框
    borderScaleFactor: 2, // 2px 宽度
  } as any);

  // 挂载自定义控件
  const currentControls: any = (obj as any).controls || {};
  currentControls.cornerDelete = deleteControl;
  currentControls.cornerDuplicate = duplicateControl;
  currentControls.cornerResize = resizeControl;
  (obj as any).controls = currentControls;

  // [2025-12-16 03:30:00] 更新对象坐标，确保控件位置正确
  obj.setCoords();

  // [2025-12-16 03:35:00] 调试日志：验证控件已应用
  console.log('[CornerControls] ✅ 角控件已应用到对象:', {
    name,
    layerType,
    hasControls: obj.hasControls,
    hasBorders: obj.hasBorders,
    controlsKeys: Object.keys(currentControls).filter(k => k.startsWith('corner')),
    borderColor: (obj as any).borderColor,
    borderScaleFactor: (obj as any).borderScaleFactor,
  });

  // [2025-12-16 03:32:00] 隐藏 Fabric 默认控件（避免与自定义控件冲突）
  // 方法1：使用 setControlsVisibility（如果可用）
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
  } else {
    // 方法2：将默认控件的 sizeX 和 sizeY 设为 0（兼容旧版本 Fabric.js）
    const defaultControls = ['tl', 'tr', 'bl', 'br', 'ml', 'mt', 'mr', 'mb', 'mtr'];
    defaultControls.forEach(controlKey => {
      if (currentControls[controlKey]) {
        const defaultControl = currentControls[controlKey];
        defaultControl.sizeX = 0;
        defaultControl.sizeY = 0;
      }
    });
  }
}

/**
 * 针对上传图片（layerType === 'upload'）的专用注册函数
 * [2025-12-16 02:07:45] 向后兼容：外部只需要调用这个函数即可
 */
export function registerUploadCornerControls(params: {
  fabric: typeof fabric;
  canvas: fabric.Canvas;
  options?: CornerControlsOptions;
}): RegisteredCornerControls {
  const matcher = (obj: fabric.Object) => {
    const layerType = (obj as any).data?.layerType;
    const name = (obj as any).name || '';
    return layerType === 'upload' || name.startsWith('image_');
  };

  return registerCornerControls({ ...params, matcher });
}

/**
 * 显式为某个对象应用上传角控件（通常在对象创建完成后调用）
 * [2025-12-16 02:07:45] 如果当前 Canvas 尚未注册，会记录警告但不会抛错
 */
export function applyUploadCornerControlsToObject(params: {
  canvas: fabric.Canvas;
  obj: fabric.Object;
}): void {
  const { canvas, obj } = params;

  const registered = registeredForCanvas.get(canvas);
  if (!registered) {
    console.warn('[CornerControls] applyUploadCornerControlsToObject called before registerUploadCornerControls');
    return;
  }

  registered.applyCornerControlsToObject(obj);
}

