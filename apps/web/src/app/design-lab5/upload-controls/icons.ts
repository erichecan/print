/**
 * Design Lab 5.1 - 角控件图标绘制
 * [2025-12-16 02:05:10] 初始实现：圆形按钮 + 删除/复制/缩放图标（参考 Custom Ink）
 */

export type IconName = 'trash' | 'copy' | 'resize';

export interface DrawControlButtonOptions {
  background: string;
  border: string;
  borderWidth: number;
  iconColor: string;
  icon: IconName;
}

/**
 * 在指定位置绘制圆形角控件按钮
 * [2025-12-16 02:05:10] 统一封装按钮绘制逻辑，便于在 Fabric 控件中复用
 */
export function drawControlButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opts: DrawControlButtonOptions,
): void {
  // 保护：size 不能为 0 或负数
  const safeSize = Math.max(size, 8);
  const radius = safeSize / 2;

  ctx.save();

  // 绘制圆形按钮背景
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = opts.background;
  ctx.fill();

  // 边框
  if (opts.borderWidth > 0) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = opts.borderWidth;
    ctx.stroke();
  }

  // 将坐标系平移到按钮中心，便于绘制图标
  ctx.translate(x, y);

  ctx.strokeStyle = opts.iconColor;
  ctx.fillStyle = opts.iconColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (opts.icon) {
    case 'trash':
      drawTrash(ctx, radius);
      break;
    case 'copy':
      drawCopy(ctx, radius);
      break;
    case 'resize':
      drawResize(ctx, radius);
      break;
  }

  ctx.restore();
}

/**
 * 删除图标（红色 X）
 * [2025-12-16 02:05:10] 参考 Custom Ink：白底 + 红色 X
 */
function drawTrash(ctx: CanvasRenderingContext2D, radius: number): void {
  const iconRadius = radius * 0.45;
  const lineWidth = Math.max(2, Math.floor(radius * 0.18));

  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.moveTo(-iconRadius, -iconRadius);
  ctx.lineTo(iconRadius, iconRadius);
  ctx.moveTo(iconRadius, -iconRadius);
  ctx.lineTo(-iconRadius, iconRadius);
  ctx.stroke();

  ctx.restore();
}

/**
 * 复制图标（两层矩形）
 * [2025-12-16 02:05:10] 参考 Custom Ink：浅色底图 + 深色前景
 */
function drawCopy(ctx: CanvasRenderingContext2D, radius: number): void {
  const w = radius * 0.9;
  const h = radius * 0.9;
  const gap = radius * 0.18;
  const lineWidth = Math.max(2, Math.floor(radius * 0.14));

  ctx.save();
  ctx.lineWidth = lineWidth;

  // 背景矩形（偏下偏右）
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.rect(-w * 0.5 + gap * 0.6, -h * 0.5 + gap * 0.6, w, h);
  ctx.stroke();

  // 前景矩形
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.rect(-w * 0.5 - gap * 0.4, -h * 0.5 - gap * 0.4, w, h);
  ctx.stroke();

  ctx.restore();
}

/**
 * 缩放图标（对角线箭头）
 * [2025-12-16 02:05:10] 参考 Custom Ink：从左下到右上对角线箭头
 */
function drawResize(ctx: CanvasRenderingContext2D, radius: number): void {
  const length = radius * 0.9;
  const arrowSize = radius * 0.35;
  const lineWidth = Math.max(2, Math.floor(radius * 0.14));

  ctx.save();
  ctx.lineWidth = lineWidth;

  // 主对角线
  ctx.beginPath();
  ctx.moveTo(-length * 0.5, length * 0.5);
  ctx.lineTo(length * 0.5, -length * 0.5);
  ctx.stroke();

  // 右上角箭头
  ctx.beginPath();
  ctx.moveTo(length * 0.5 - arrowSize, -length * 0.5);
  ctx.lineTo(length * 0.5, -length * 0.5);
  ctx.lineTo(length * 0.5, -length * 0.5 + arrowSize);
  ctx.stroke();

  ctx.restore();
}

