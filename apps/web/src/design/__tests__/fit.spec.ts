/**
 * Fit Algorithm Unit Tests
* 测试画布图片适配算法
 */

import { calculateImageFit, fitImageToCanvas } from '../utils/fit';

describe('Fit Algorithm', () => {
  describe('calculateImageFit', () => {
    it('should calculate fit for contain mode (default)', () => {
      const result = calculateImageFit({
        canvasWidth: 1000,
        canvasHeight: 1200,
        imageWidth: 2000,
        imageHeight: 2400,
        fit: 'contain',
      });
      
      expect(result.scale).toBeLessThan(1); // 图片需要缩小
      expect(result.width).toBeLessThanOrEqual(1000 * 0.65); // 应该在安全区内
      expect(result.height).toBeLessThanOrEqual(1200 * 0.75);
      expect(result.left).toBeGreaterThanOrEqual(0);
      expect(result.top).toBeGreaterThanOrEqual(0);
    });
    
    it('should calculate fit for cover mode', () => {
      const result = calculateImageFit({
        canvasWidth: 1000,
        canvasHeight: 1200,
        imageWidth: 800,
        imageHeight: 600,
        fit: 'cover',
      });
      
      // cover 模式应该填充安全区
      expect(result.scale).toBeGreaterThan(1);
      expect(result.width).toBeGreaterThanOrEqual(1000 * 0.65);
      expect(result.height).toBeGreaterThanOrEqual(1200 * 0.75);
    });
    
    it('should center image correctly (center origin)', () => {
// 修复：验证基于 center 原点的居中算法
      const result = calculateImageFit({
        canvasWidth: 1000,
        canvasHeight: 1200,
        imageWidth: 650,
        imageHeight: 900,
        fit: 'contain',
      });
      
      // 当 originX/originY 为 'center' 时，left/top 应该是画布中心坐标
      const expectedLeft = 1000 / 2; // 画布中心 X
      const expectedTop = 1200 / 2;  // 画布中心 Y
      
      expect(Math.abs(result.left - expectedLeft)).toBeLessThan(1);
      expect(Math.abs(result.top - expectedTop)).toBeLessThan(1);
    });
    
    it('should support DPI conversion', () => {
      const result = calculateImageFit({
        canvasWidth: 1000,
        canvasHeight: 1200,
        imageWidth: 100, // 将被 DPI 转换覆盖
        imageHeight: 100,
        physicalWidth: 10, // 10 英寸
        physicalHeight: 10,
        dpi: 300, // 300 DPI
        fit: 'contain',
      });
      
      // 实际像素尺寸应该是 10 * 300 = 3000
      // 但由于 fit 是 contain，会按比例缩放
      expect(result.scale).toBeLessThan(1);
    });
    
    it('should handle custom safe area', () => {
      const result = calculateImageFit({
        canvasWidth: 1000,
        canvasHeight: 1200,
        imageWidth: 2000,
        imageHeight: 2400,
        safeAreaWidth: 0.8,
        safeAreaHeight: 0.9,
        fit: 'contain',
      });
      
      expect(result.safeAreaWidth).toBe(1000 * 0.8);
      expect(result.safeAreaHeight).toBe(1200 * 0.9);
    });
  });
  
  describe('fitImageToCanvas', () => {
    it('should use default safe area', () => {
      const result = fitImageToCanvas(1000, 1200, 2000, 2400, 'contain');
      
      expect(result.safeAreaWidth).toBe(1000 * 0.65);
      expect(result.safeAreaHeight).toBe(1200 * 0.75);
      expect(result.scale).toBeLessThan(1);
    });
  });
});
