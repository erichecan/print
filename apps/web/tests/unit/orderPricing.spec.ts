// [2025-01-31 19:50:00] 订单价格估算单元测试

import { describe, it, expect } from 'vitest';
import { estimateOrderItemPricing } from '@/lib/services/orderPricing';
import type { OrderItemPayload } from '@/types/order';

describe('estimateOrderItemPricing', () => {
  it('splits batches when size overrides differ within same color', () => {
    const payload: OrderItemPayload = {
      productId: 'tee-1001',
      printMethod: 'dtf',
      colors: [
        {
          colorCode: 'RED',
          colorName: 'Red',
          printConfigs: [
            {
              position: 'front',
              areaSize: { widthCm: 25, heightCm: 15 },
              methodSpecific: { dtfLayers: { whiteUnderbase: true } },
            },
          ],
          sizeBreakdown: [
            { sizeCode: 'S', qty: 5 },
            { sizeCode: 'M', qty: 5 },
            { sizeCode: 'L', qty: 10 },
          ],
          allowSizeOverrides: true,
          sizeOverrides: [
            {
              sizeCode: 'L',
              overridePrintConfigs: [
                { position: 'front', areaSize: { widthCm: 25, heightCm: 15 } },
                { position: 'back', areaSize: { widthCm: 30, heightCm: 30 } },
              ],
            },
          ],
        },
      ],
    };
    
    const res = estimateOrderItemPricing(payload);
    
    expect(res.batches.length).toBeGreaterThan(1);
    expect(res.total).toBeGreaterThan(0);
    expect(res.currency).toBe('CAD');
  });

  it('calculates single batch when no size overrides', () => {
    const payload: OrderItemPayload = {
      productId: 'tee-1001',
      printMethod: 'screen',
      colors: [
        {
          colorCode: 'BLUE',
          colorName: 'Blue',
          printConfigs: [{ position: 'front', areaSize: { widthCm: 20, heightCm: 20 } }],
          sizeBreakdown: [
            { sizeCode: 'M', qty: 10 },
            { sizeCode: 'L', qty: 10 },
          ],
        },
      ],
    };
    
    const res = estimateOrderItemPricing(payload);
    
    expect(res.batches.length).toBe(1);
    expect(res.batches[0].totalQty).toBe(20);
  });
});
