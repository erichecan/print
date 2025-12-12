/**
 * [2025-12-19] 订单项定价计算服务
 * 支持按颜色分组的印刷位和per-size overrides的定价计算
 */
import { OrderItemColorGroup, PositionConfig, PricingCalculationResult } from '@/types/order';

/**
 * 计算订单项的定价
 * 规则：
 * - 如果颜色组未启用per-size overrides，所有尺码共享该颜色组的默认位置配置
 * - 如果启用了per-size overrides，特定尺码使用覆盖配置，未覆盖的位置继承默认配置
 * - 价格 = Σ(位置单价 × 数量) 对于每个颜色×尺码组合
 */
export function calcOrderItemPricing(
  groups: OrderItemColorGroup[],
  currency: 'CAD' | 'USD' = 'CAD'
): PricingCalculationResult {
  let total = 0;
  const breakdown: PricingCalculationResult['breakdown'] = [];

  for (const group of groups) {
    // 获取该颜色组启用的默认位置配置
    const defaultPositions = group.positions.filter(p => p.enabled);
    
    // 获取有数量的尺码
    const sizeEntries = Object.entries(group.quantities).filter(([_, qty]) => qty > 0);
    
    for (const [size, qty] of sizeEntries) {
      // 检查是否有per-size overrides
      const hasPerSizeOverrides = group.perSizeOverrides && group.perSizeOverrides.length > 0;
      
      let effectivePositions: PositionConfig[];
      
      if (hasPerSizeOverrides) {
        // 查找该尺码的覆盖配置
        const sizeOverride = group.perSizeOverrides!.find(o => o.size === size);
        const overridePositions = sizeOverride?.overrides || [];
        
        // 获取启用的覆盖位置
        const enabledOverrides = overridePositions.filter(p => p.enabled);
        const overrideKeys = new Set(enabledOverrides.map(p => p.positionKey));
        
        // 合并：覆盖位置 + 默认位置（未被覆盖的）
        effectivePositions = [
          ...enabledOverrides,
          ...defaultPositions.filter(p => !overrideKeys.has(p.positionKey))
        ];
      } else {
        // 没有per-size overrides，使用默认配置
        effectivePositions = defaultPositions;
      }
      
      // 计算该颜色×尺码的小计
      const subtotal = effectivePositions.reduce((sum, pos) => {
        return sum + (pos.unitPrice * qty);
      }, 0);
      
      total += subtotal;
      
      breakdown.push({
        color: group.colorName,
        size,
        quantity: qty,
        positions: effectivePositions,
        subtotal
      });
    }
  }

  return {
    total,
    currency,
    breakdown
  };
}

/**
 * 验证颜色组配置是否有效
 * 规则：
 * - 至少一个颜色组有启用的位置配置
 * - 每个有数量的尺码至少有一个启用的位置（在默认配置或覆盖配置中）
 */
export function validateColorGroups(groups: OrderItemColorGroup[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (groups.length === 0) {
    errors.push('至少需要添加一个颜色');
    return { valid: false, errors };
  }
  
  for (const group of groups) {
    const hasQuantities = Object.values(group.quantities).some(qty => qty > 0);
    if (!hasQuantities) {
      continue; // 跳过没有数量的颜色组
    }
    
    // 检查默认位置配置
    const hasDefaultEnabledPositions = group.positions.some(p => p.enabled);
    
    // 检查per-size overrides
    if (group.perSizeOverrides && group.perSizeOverrides.length > 0) {
      const sizesWithQty = Object.entries(group.quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([size]) => size);
      
      for (const size of sizesWithQty) {
        const override = group.perSizeOverrides!.find(o => o.size === size);
        const overrideEnabled = override?.overrides.some(p => p.enabled) || false;
        const defaultEnabled = hasDefaultEnabledPositions;
        
        if (!overrideEnabled && !defaultEnabled) {
          errors.push(`颜色"${group.colorName}"的尺码"${size}"没有启用的印刷位置`);
        }
      }
    } else {
      // 没有per-size overrides，检查默认配置
      if (!hasDefaultEnabledPositions) {
        errors.push(`颜色"${group.colorName}"没有启用的印刷位置`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
