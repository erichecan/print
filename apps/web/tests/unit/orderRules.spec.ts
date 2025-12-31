// 订单规则校验单元测试

import { describe, it, expect } from 'vitest';
import {
  validateColorConfigs,
  validateSizeOverrides,
  validatePrintFeasibility,
  checkAreaLimit,
} from '@/lib/services/orderRules';
import type { OrderItemColorInput, OrderItemPayload } from '@/types/order';

describe('orderRules', () => {
  describe('validateColorConfigs', () => {
    it('returns errors for invalid position', () => {
      const colors: OrderItemColorInput[] = [
        {
          colorCode: 'RED',
          colorName: 'Red',
          printConfigs: [{ position: 'invalid' as any, areaSize: { widthCm: 10, heightCm: 10 } }],
          sizeBreakdown: [],
        },
      ];
      
      const result = validateColorConfigs(colors);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('position invalid');
    });

    it('returns errors for area exceeding limits', () => {
      const colors: OrderItemColorInput[] = [
        {
          colorCode: 'RED',
          colorName: 'Red',
          printConfigs: [{ position: 'front', areaSize: { widthCm: 50, heightCm: 50 } }],
          sizeBreakdown: [],
        },
      ];
      
      const result = validateColorConfigs(colors);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('exceeds max'))).toBe(true);
    });
  });

  describe('checkAreaLimit', () => {
    it('returns empty array for valid area', () => {
      const cfg = { position: 'front' as const, areaSize: { widthCm: 10, heightCm: 10 } };
      const errors = checkAreaLimit(cfg);
      expect(errors.length).toBe(0);
    });

    it('returns errors for exceeded area', () => {
      const cfg = { position: 'front' as const, areaSize: { widthCm: 40, heightCm: 40 } };
      const errors = checkAreaLimit(cfg);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePrintFeasibility', () => {
    it('returns warnings for deep color without white underbase', () => {
      const payload: OrderItemPayload = {
        productId: 'tee-1001',
        printMethod: 'dtf',
        colors: [
          {
            colorCode: 'BLACK',
            colorName: 'Black',
            printConfigs: [{ position: 'front', areaSize: { widthCm: 10, heightCm: 10 } }],
            sizeBreakdown: [],
          },
        ],
      };
      
      const result = validatePrintFeasibility(payload);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.message.includes('white underbase'))).toBe(true);
    });
  });
});
