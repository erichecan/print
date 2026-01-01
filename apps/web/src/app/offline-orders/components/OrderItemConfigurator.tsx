/**
* 订单项配置器组件
 * 容器组件，管理所有颜色组的印刷位置配置
 */
'use client';

import { useState, useCallback } from 'react';
import { OrderItemColorGroup, PositionKey } from '@/types/order';
import { ColorGroupCard } from './ColorGroupCard';
import { calcOrderItemPricing, validateColorGroups } from '@/lib/services/orderItemPricing';
import { PricingBreakdown } from './PricingBreakdown';

interface OrderItemConfiguratorProps {
  productItemId: string; // 产品项ID
  colorGroups: OrderItemColorGroup[]; // 颜色组列表
  onUpdate: (groups: OrderItemColorGroup[]) => void; // 更新回调
  onValidationChange?: (isValid: boolean, errors: string[]) => void; // 验证状态变化回调
}

export function OrderItemConfigurator({
  productItemId,
  colorGroups,
  onUpdate,
  onValidationChange
}: OrderItemConfiguratorProps) {
  const [showPricing, setShowPricing] = useState(false);

  // 更新单个颜色组
  const handleGroupUpdate = useCallback((index: number, updated: OrderItemColorGroup) => {
    const newGroups = [...colorGroups];
    newGroups[index] = updated;
    onUpdate(newGroups);

    // 触发验证
    const validation = validateColorGroups(newGroups);
    onValidationChange?.(validation.valid, validation.errors);
  }, [colorGroups, onUpdate, onValidationChange]);

  // 继承上一颜色
  const handleInherit = useCallback((index: number) => {
    if (index === 0) {
      return; // 第一个颜色无法继承
    }

    const previousGroup = colorGroups[index - 1];
    if (previousGroup && previousGroup.positions.length > 0) {
      const inheritedPositions = previousGroup.positions.map(pos => ({
        ...pos,
        designAssetId: pos.designAssetId || null
      }));

      handleGroupUpdate(index, {
        ...colorGroups[index],
        positions: inheritedPositions,
        inheritFromPrevious: true
      });
    }
  }, [colorGroups, handleGroupUpdate]);

  // 复制到其他颜色
  const handleCopyToOthers = useCallback((sourceIndex: number) => {
    const sourceGroup = colorGroups[sourceIndex];
    if (!sourceGroup || sourceGroup.positions.length === 0) {
      alert('当前颜色没有可复制的配置');
      return;
    }

    // 确认对话框
    const targetIndices = colorGroups
      .map((_, idx) => idx)
      .filter(idx => idx !== sourceIndex);

    if (targetIndices.length === 0) {
      alert('没有其他颜色可以复制到');
      return;
    }

    // confirmation removed
    // if (confirm(`确定要将"${sourceGroup.colorName}"的配置复制到其他 ${targetIndices.length} 个颜色吗？`)) {
    //   const newGroups = [...colorGroups];
    //   const sourcePositions = sourceGroup.positions.map(pos => ({
    //     ...pos,
    //     designAssetId: pos.designAssetId || null
    //   }));

    //   targetIndices.forEach(idx => {
    //     newGroups[idx] = {
    //       ...newGroups[idx],
    //       positions: sourcePositions,
    //       inheritFromPrevious: false
    //     };
    //   });

    //   onUpdate(newGroups);

    //   // 触发验证
    //   const validation = validateColorGroups(newGroups);
    //   onValidationChange?.(validation.valid, validation.errors);
    // }

    // Execute directly
    const newGroups = [...colorGroups];
    const sourcePositions = sourceGroup.positions.map(pos => ({
      ...pos,
      designAssetId: pos.designAssetId || null
    }));

    targetIndices.forEach(idx => {
      newGroups[idx] = {
        ...newGroups[idx],
        positions: sourcePositions,
        inheritFromPrevious: false
      };
    });

    onUpdate(newGroups);

    // 触发验证
    const validation = validateColorGroups(newGroups);
    onValidationChange?.(validation.valid, validation.errors);
  }, [colorGroups, onUpdate, onValidationChange]);

  // 计算定价
  const pricingResult = calcOrderItemPricing(colorGroups);

  // 验证配置
  const validation = validateColorGroups(colorGroups);

  return (
    <div className="space-y-6">
      {/* 颜色组列表 */}
      <div className="space-y-4">
        {colorGroups.map((group, index) => (
          <ColorGroupCard
            key={group.id}
            group={group}
            previousGroup={index > 0 ? colorGroups[index - 1] : null}
            onUpdate={(updated) => handleGroupUpdate(index, updated)}
            onInherit={index > 0 ? () => handleInherit(index) : undefined}
            onCopyToOthers={() => handleCopyToOthers(index)}
          />
        ))}
      </div>

      {/* 验证错误提示 */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-900 mb-2">配置验证失败：</div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validation.errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowPricing(!showPricing)}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showPricing ? '隐藏' : '显示'}报价明细
        </button>

        <div className="text-lg font-semibold text-gray-900">
          总计: ${pricingResult.total.toFixed(2)} {pricingResult.currency}
        </div>
      </div>

      {/* 报价明细 */}
      {showPricing && (
        <PricingBreakdown breakdown={pricingResult.breakdown} />
      )}
    </div>
  );
}
