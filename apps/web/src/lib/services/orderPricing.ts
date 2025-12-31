// 订单价格估算服务

import type { OrderItemPayload, PricingBreakdown, PrintConfig } from '@/types/order';

/**
* 估算订单项价格（考虑尺码覆盖拆批）
 */
export function estimateOrderItemPricing(item: OrderItemPayload): PricingBreakdown {
  const batches: PricingBreakdown['batches'] = [];
  
  for (const color of item.colors) {
    const defaultKey = keyForPositions(color.printConfigs);
    const groups: Record<string, number> = {};
    
    // 默认组（所有尺码）
    groups[defaultKey] = (color.sizeBreakdown || []).reduce((s, x) => s + x.qty, 0);
    
    // 覆盖拆分（高级模式）
    if (color.allowSizeOverrides && color.sizeOverrides?.length) {
      for (const ov of color.sizeOverrides) {
        const k = keyForPositions(ov.overridePrintConfigs);
        const qty = (color.sizeBreakdown || []).find(s => s.sizeCode === ov.sizeCode)?.qty ?? 0;
        
        // 从默认组中减去覆盖的尺码数量
        groups[defaultKey] -= qty;
        
        // 添加到覆盖组
        groups[k] = (groups[k] ?? 0) + qty;
      }
    }
    
    // 计算价格
    for (const [k, qty] of Object.entries(groups)) {
      if (qty <= 0) continue;
      const unit = unitPrice(item.printMethod, k);
      batches.push({
        colorCode: color.colorCode,
        positionsKey: k,
        totalQty: qty,
        unitPrice: unit,
        subtotal: round2(unit * qty),
      });
    }
  }
  
  const total = round2(batches.reduce((s, b) => s + b.subtotal, 0));
  return { total, currency: 'CAD', batches };
}

/**
* 生成印刷位配置的唯一键
 */
function keyForPositions(cfgs: PrintConfig[]): string {
  return cfgs
    .map(c => `${c.position}[${c.areaSize.widthCm}x${c.areaSize.heightCm}]`)
    .sort()
    .join('+');
}

/**
* 计算单价（基于工艺、位置数量、面积）
 */
function unitPrice(method: 'dtf' | 'screen' | 'embroidery', k: string): number {
  // 简化示例：按位点数量与面积估算单价
  const positions = k.split('+');
  const count = positions.length;
  const area = positions.reduce((s, p) => {
    const m = p.match(/\[(\d+)x(\d+)\]/);
    if (!m) return s;
    return s + Number(m[1]) * Number(m[2]);
  }, 0);
  
  const base = method === 'dtf' ? 4 : method === 'screen' ? 3 : 5;
  return round2(base + count * 1.5 + area / 300); // 示例算法
}

/**
* 四舍五入到2位小数
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
