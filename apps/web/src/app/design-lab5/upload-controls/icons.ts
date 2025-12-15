/**
 * Upload Corner Controls Icons (Canvas 2D)
 * [2025-12-15 16:05:00] Design Lab 5.1: 从零实现上传图片三按钮（删除/复制/缩放）的图标绘制
 */

export type IconName = 'trash' | 'copy' | 'resize';

export function drawControlButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opts: {
    background: string;
    border: string;
    borderWidth: number;
    iconColor: string;
    icon: IconName;
  }
): void {
  const half = size / 2;

  // 背景圆角矩形
  const r = Math.max(4, Math.floor(size * 0.18));
  const left = x - half;
  const top = y - half;
  const right = x + half;
  const bottom = y + half;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.quadraticCurveTo(right, top, right, top + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(left + r, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - r);
  ctx.lineTo(left, top + r);
  ctx.quadraticCurveTo(left, top, left + r, top);
  ctx.closePath();

  ctx.fillStyle = opts.background;
  ctx.fill();

  ctx.strokeStyle = opts.border;
  ctx.lineWidth = opts.borderWidth;
  ctx.stroke();

  // 图标
  ctx.translate(x, y);
  ctx.strokeStyle = opts.iconColor;
  ctx.fillStyle = opts.iconColor;
  ctx.lineWidth = Math.max(1.5, Math.floor(size * 0.10));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (opts.icon) {
    case 'trash':
      drawTrash(ctx, size);
      break;
    case 'copy':
      drawCopy(ctx, size);
      break;
    case 'resize':
      drawResize(ctx, size);
      break;
  }

  ctx.restore();
}

function drawTrash(ctx: CanvasRenderingContext2D, size: number): void {
  // [2025-12-15 16:05:00] 简易垃圾桶
  const s = size * 0.42;
  const w = s;
  const h = s * 0.90;
  const topY = -h * 0.15;

  // 盖子
  ctx.beginPath();
  ctx.moveTo(-w * 0.55, topY - h * 0.25);
  ctx.lineTo(w * 0.55, topY - h * 0.25);
  ctx.stroke();

  // 桶身
  ctx.beginPath();
  ctx.rect(-w / 2, topY, w, h);
  ctx.stroke();

  // 三条竖线
  ctx.beginPath();
  ctx.moveTo(-w * 0.20, topY + h * 0.15);
  ctx.lineTo(-w * 0.20, topY + h * 0.85);
  ctx.moveTo(0, topY + h * 0.15);
  ctx.lineTo(0, topY + h * 0.85);
  ctx.moveTo(w * 0.20, topY + h * 0.15);
  ctx.lineTo(w * 0.20, topY + h * 0.85);
  ctx.stroke();
}

function drawCopy(ctx: CanvasRenderingContext2D, size: number): void {
  // [2025-12-15 16:05:00] 简易复制（两张叠纸）
  const s = size * 0.40;
  const w = s;
  const h = s * 0.85;

  // 后面一张
  ctx.beginPath();
  ctx.rect(-w * 0.10, -h * 0.35, w, h);
  ctx.stroke();

  // 前面一张（偏移）
  ctx.beginPath();
  ctx.rect(-w * 0.30, -h * 0.15, w, h);
  ctx.stroke();
}

function drawResize(ctx: CanvasRenderingContext2D, size: number): void {
  // [2025-12-15 16:05:00] 简易缩放（对角箭头）
  const s = size * 0.42;

  // 斜线
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, s * 0.15);
  ctx.lineTo(s * 0.35, -s * 0.35);
  ctx.stroke();

  // 右上箭头
  ctx.beginPath();
  ctx.moveTo(s * 0.35, -s * 0.35);
  ctx.lineTo(s * 0.10, -s * 0.35);
  ctx.moveTo(s * 0.35, -s * 0.35);
  ctx.lineTo(s * 0.35, -s * 0.10);
  ctx.stroke();

  // 左下箭头
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, s * 0.15);
  ctx.lineTo(-s * 0.15, s * -0.10);
  ctx.moveTo(-s * 0.15, s * 0.15);
  ctx.lineTo(s * 0.10, s * 0.15);
  ctx.stroke();
}
