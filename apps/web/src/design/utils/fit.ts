/**
 * Canvas Image Fit Algorithms
* 实现画布图片适配算法（contain/cover + 安全区居中）
 * 
 * 参考 Custom Ink 的实现：
 * - 主图等比缩放到"最长边贴合安全区"的 fit（contain）
 * - 居中：[x = (canvasWidth - imageWidth)/2, y = (canvasHeight - imageHeight)/2]
 * - 支持 DPI 转换：pixels = inches × dpi
 */

export interface FitOptions {
  /** 画布宽度（像素） */
  canvasWidth: number;
  /** 画布高度（像素） */
  canvasHeight: number;
  /** 图片宽度（像素） */
  imageWidth: number;
  /** 图片高度（像素） */
  imageHeight: number;
  /** 安全区宽度（相对于画布的百分比，默认 0.65） */
  safeAreaWidth?: number;
  /** 安全区高度（相对于画布的百分比，默认 0.75） */
  safeAreaHeight?: number;
  /** Fit 模式：contain（完整显示，可能有留白）或 cover（填充，可能裁剪） */
  fit?: 'contain' | 'cover';
  /** 物理尺寸（英寸）- 可选，如果提供则用于 DPI 计算 */
  physicalWidth?: number;
  /** 物理高度（英寸）- 可选 */
  physicalHeight?: number;
  /** DPI（点每英寸）- 默认 300 */
  dpi?: number;
}

export interface FitResult {
  /** 缩放后的宽度 */
  width: number;
  /** 缩放后的高度 */
  height: number;
  /** X 坐标（左上角） */
  left: number;
  /** Y 坐标（左上角） */
  top: number;
  /** 缩放比例 */
  scale: number;
  /** 实际使用的安全区宽度 */
  safeAreaWidth: number;
  /** 实际使用的安全区高度 */
  safeAreaHeight: number;
}

/**
 * 计算图片在画布中的适配位置和尺寸
* 实现 Custom Ink 风格的图片适配算法
 */
export function calculateImageFit(options: FitOptions): FitResult {
  const {
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
safeAreaWidth = 0.9, // 修复：增大默认安全区至90%（CustomInk风格：铺满画布主要区域）
safeAreaHeight = 0.9, // 修复：增大默认安全区至90%（CustomInk风格：铺满画布主要区域）
fit = 'cover', // 修复：改为cover模式（填充安全区，可能裁剪边缘，但视觉更大更突出）
    physicalWidth,
    physicalHeight,
    dpi = 300,
  } = options;
  
  // 计算实际安全区尺寸
  const actualSafeAreaWidth = canvasWidth * safeAreaWidth;
  const actualSafeAreaHeight = canvasHeight * safeAreaHeight;
  
  // 如果提供了物理尺寸，计算实际像素尺寸
  let actualImageWidth = imageWidth;
  let actualImageHeight = imageHeight;
  
  if (physicalWidth && physicalHeight && dpi) {
    actualImageWidth = physicalWidth * dpi;
    actualImageHeight = physicalHeight * dpi;
  }
  
  // 计算缩放比例
  let scale: number;
  
  if (fit === 'contain') {
    // contain: 保持宽高比，完整显示图片，可能有留白
    const scaleX = actualSafeAreaWidth / actualImageWidth;
    const scaleY = actualSafeAreaHeight / actualImageHeight;
    scale = Math.min(scaleX, scaleY);
  } else {
    // cover: 保持宽高比，填充安全区，可能裁剪
    const scaleX = actualSafeAreaWidth / actualImageWidth;
    const scaleY = actualSafeAreaHeight / actualImageHeight;
    scale = Math.max(scaleX, scaleY);
  }
  
  // 计算缩放后的尺寸
  const scaledWidth = actualImageWidth * scale;
  const scaledHeight = actualImageHeight * scale;
  
// 修复：计算居中位置（基于 center 原点，而非 left/top）
  // 当 originX/originY 为 'center' 时，left/top 应该直接是画布中心坐标
  const centerLeft = canvasWidth / 2;
  const centerTop = canvasHeight / 2;
  
  // 返回画布中心坐标（用于 center 原点）和左上角坐标（用于兼容性）
  const left = centerLeft; // 使用中心坐标
  const top = centerTop;
  
  return {
    width: scaledWidth,
    height: scaledHeight,
    left,
    top,
    scale,
    safeAreaWidth: actualSafeAreaWidth,
    safeAreaHeight: actualSafeAreaHeight,
  };
}

/**
 * 计算图片在画布中的适配位置和尺寸（简化版本，使用默认安全区）
 */
export function fitImageToCanvas(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  fit: 'contain' | 'cover' = 'contain'
): FitResult {
  return calculateImageFit({
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
    fit,
  });
}
