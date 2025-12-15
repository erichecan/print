/**
 * Design Lab 5.1 - Upload Corner Controls E2E
 * [2025-12-15 16:05:00] 验证上传图片三按钮角控件：delete / duplicate / resize(等比)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
// [2025-12-15 16:05:00] 夹具图片路径：使用 apps/web/public 下真实 PNG（避免“看似 .png 实为 svg 文本”导致 Image load error）
const FIXTURE_PNG =
  process.env.DESIGN_LAB_UPLOAD_FIXTURE ||
  require('path').resolve(__dirname, '../../public/assets/brands/gildan.png');

async function waitForUploadObject(page: any) {
  await page.waitForFunction(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return false;
    const objs = canvas.getObjects?.() || [];
    return objs.some((o: any) => o?.data?.layerType === 'upload');
  }, null, { timeout: 60000 }); // [2025-12-15 16:05:00] 增加等待时间，避免 dev 环境首次编译/初始化过慢
}

async function getActiveUploadObjectInfo(page: any) {
  return await page.evaluate(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return null;
    const active = canvas.getActiveObject?.();
    if (!active) return null;
    return {
      hasUploadLayerType: (active as any)?.data?.layerType === 'upload',
      controlsKeys: Object.keys((active as any).controls || {}),
      oCoordsKeys: Object.keys((active as any).oCoords || {}),
      scaleX: (active as any).scaleX,
      scaleY: (active as any).scaleY,
    };
  });
}

async function clickControl(page: any, controlKey: string) {
  const pt = await page.evaluate((key: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return null;
    const active = canvas.getActiveObject?.();
    if (!active) return null;

    const oCoords = (active as any).oCoords;
    const p = oCoords?.[key];
    if (!p) return null;

    const el: HTMLCanvasElement | undefined = (canvas as any).upperCanvasEl;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const retina = typeof (canvas as any).getRetinaScaling === 'function' ? (canvas as any).getRetinaScaling() : 1;

    return {
      x: rect.left + p.x / retina,
      y: rect.top + p.y / retina,
    };
  }, controlKey);

  expect(pt).toBeTruthy();
  await page.mouse.click(pt.x, pt.y);
}

test.describe('Design Lab 5.1 Upload Corner Controls', () => {
  test('upload image shows 3 controls; delete/duplicate/resize work', async ({ page }) => {
    test.setTimeout(120000); // [2025-12-15 16:05:00] dev 环境首次编译/初始化可能较慢，放宽单测超时

    // [2025-12-15 16:05:00] 捕获页面错误与 console.error，便于定位上传失败原因
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err?.message || String(err)}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });

    await page.goto(`${BASE_URL}/design-lab`, { waitUntil: 'networkidle' });

    // [2025-12-15 16:05:00] 等待 Fabric canvas 暴露到 window（DesignLabClient 会设置 window.fabricCanvas）
    await page.waitForFunction(() => !!(window as any).fabricCanvas, null, { timeout: 30000 });

    // [2025-12-15 16:05:00] 等待隐藏的 file input 挂载完成（注意：它是 hidden，不要求可见）
    await page.waitForSelector('input[type=\"file\"]', { state: 'attached', timeout: 10000 });

    // [2025-12-15 16:05:00] 上传图片：定位 DesignLabClient 底部隐藏 input（accept 精确匹配 + display:none）
    const dlInput = page.locator(
      'input[type=\"file\"][accept=\"image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml\"][style*=\"display: none\"]'
    );
    await expect(dlInput).toHaveCount(1, { timeout: 10000 });
    await dlInput.first().setInputFiles(FIXTURE_PNG);

    try {
      await waitForUploadObject(page);
    } catch (e) {
      const diag = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        const objs = canvas?.getObjects?.() || [];
        const uploadCount = objs.filter((o: any) => o?.data?.layerType === 'upload').length;
        const fileInputs = Array.from(document.querySelectorAll('input[type=\"file\"]')).map((el: any) => ({
          accept: el.accept,
          style: el.getAttribute('style') || '',
          disabled: !!el.disabled,
        }));
        return { uploadCount, fileInputsCount: fileInputs.length, fileInputs: fileInputs.slice(0, 5) };
      });
      throw new Error(
        `Upload object not detected. errors=${errors.join(' | ')} diag=${JSON.stringify(diag)} original=${String(e)}`
      );
    }

    // 选中 upload 对象并检查 controls
    const info = await getActiveUploadObjectInfo(page);
    expect(info).toBeTruthy();
    expect(info.hasUploadLayerType).toBeTruthy();

    // [2025-12-15 16:05:00] 仅三个自定义控件（uploadDelete/uploadDuplicate/uploadResize）
    expect(info.controlsKeys).toEqual(expect.arrayContaining(['uploadDelete', 'uploadDuplicate', 'uploadResize']));

    // 通过 oCoords 存在性确保可点击
    expect(info.oCoordsKeys).toEqual(expect.arrayContaining(['uploadDelete', 'uploadDuplicate', 'uploadResize']));

    // duplicate：数量 +1
    const beforeCount = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      const objs = canvas?.getObjects?.() || [];
      return objs.filter((o: any) => o?.data?.layerType === 'upload').length;
    });

    await clickControl(page, 'uploadDuplicate');

    await page.waitForFunction((prev: number) => {
      const canvas = (window as any).fabricCanvas;
      const objs = canvas?.getObjects?.() || [];
      const count = objs.filter((o: any) => o?.data?.layerType === 'upload').length;
      return count === prev + 1;
    }, beforeCount, { timeout: 10000 });

    // resize：等比缩放（scaleX/scaleY 同步变化）
    const beforeScale = await getActiveUploadObjectInfo(page);
    expect(beforeScale).toBeTruthy();

    const start = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      const active = canvas?.getActiveObject?.();
      const el: HTMLCanvasElement | undefined = (canvas as any)?.upperCanvasEl;
      if (!canvas || !active || !el) return null;
      const p = (active as any).oCoords?.uploadResize;
      if (!p) return null;
      const rect = el.getBoundingClientRect();
      const retina = typeof (canvas as any).getRetinaScaling === 'function' ? (canvas as any).getRetinaScaling() : 1;
      return { x: rect.left + p.x / retina, y: rect.top + p.y / retina };
    });

    expect(start).toBeTruthy();

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 60, start.y + 60);
    await page.mouse.up();

    await page.waitForFunction((prev: { sx: number; sy: number }) => {
      const canvas = (window as any).fabricCanvas;
      const active = canvas?.getActiveObject?.();
      if (!active) return false;
      const sx = (active as any).scaleX;
      const sy = (active as any).scaleY;
      if (typeof sx !== 'number' || typeof sy !== 'number') return false;
      return sx !== prev.sx && sy !== prev.sy && Math.abs(sx - sy) < 0.02;
    }, { sx: beforeScale.scaleX, sy: beforeScale.scaleY }, { timeout: 10000 });

    // delete：数量 -1（删除当前 active upload）
    const beforeDeleteCount = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      const objs = canvas?.getObjects?.() || [];
      return objs.filter((o: any) => o?.data?.layerType === 'upload').length;
    });

    await clickControl(page, 'uploadDelete');

    await page.waitForFunction((prev: number) => {
      const canvas = (window as any).fabricCanvas;
      const objs = canvas?.getObjects?.() || [];
      const count = objs.filter((o: any) => o?.data?.layerType === 'upload').length;
      return count === prev - 1;
    }, beforeDeleteCount, { timeout: 10000 });
  });
});
