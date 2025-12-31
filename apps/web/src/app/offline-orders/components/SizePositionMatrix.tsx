/**
* 尺码×位置矩阵组件
 * 在启用per-size overrides时显示，支持单元格级别的覆盖设置
 */
'use client';

import { OrderItemColorGroup, PositionKey, PositionConfig } from '@/types/order';
import { PositionCell } from './PositionCell';

interface SizePositionMatrixProps {
  group: OrderItemColorGroup;
  onChange: (updated: OrderItemColorGroup) => void;
  onEdit: (positionKey: PositionKey, size: string) => void;
}

const POSITION_KEYS: PositionKey[] = ['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket'];
const POSITION_LABELS: Record<PositionKey, string> = {
  front: '正面',
  back: '背面',
  left_sleeve: '左袖',
  right_sleeve: '右袖',
  pocket: '口袋',
  tag_inside: '内标',
  tag_outside: '外标',
  custom: '其他'
};

export function SizePositionMatrix({ group, onChange, onEdit }: SizePositionMatrixProps) {
// 获取有数量的尺码列表
  const sizesWithQty = Object.entries(group.quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([size]) => size)
    .sort();

  if (sizesWithQty.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        请先在步骤2中为该颜色填写尺码数量
      </div>
    );
  }

// 获取某个尺码×位置的生效配置
  const getEffectiveConfig = (size: string, positionKey: PositionKey): PositionConfig | null => {
    // 先查找override
    const sizeOverride = group.perSizeOverrides?.find(o => o.size === size);
    const override = sizeOverride?.overrides.find(p => p.positionKey === positionKey);
    
    if (override) {
      return override;
    }
    
    // 如果没有override，使用默认配置
    const defaultConfig = group.positions.find(p => p.positionKey === positionKey);
    return defaultConfig || null;
  };

// 检查某个单元格是否有override
  const hasOverride = (size: string, positionKey: PositionKey): boolean => {
    const sizeOverride = group.perSizeOverrides?.find(o => o.size === size);
    return !!sizeOverride?.overrides.find(p => p.positionKey === positionKey);
  };

  return (
    <div className="overflow-x-auto">
      <div className="text-sm font-medium text-gray-700 mb-3">
        尺码 × 位置矩阵（可点击单元格进行覆盖设置）：
      </div>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
              尺码 \ 位置
            </th>
            {POSITION_KEYS.map((key) => (
              <th
                key={key}
                className="border border-gray-300 px-3 py-2 text-center font-semibold min-w-[120px]"
              >
                {POSITION_LABELS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizesWithQty.map((size) => (
            <tr key={size} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">
                {size} ({group.quantities[size]}件)
              </td>
              {POSITION_KEYS.map((positionKey) => {
                const effective = getEffectiveConfig(size, positionKey);
                const overridden = hasOverride(size, positionKey);
                const defaultConfig = group.positions.find(p => p.positionKey === positionKey);

                return (
                  <td
                    key={positionKey}
                    className="border border-gray-300 px-2 py-2"
                  >
                    <PositionCell
                      config={effective}
                      defaultConfig={defaultConfig}
                      overridden={overridden}
                      onEdit={() => onEdit(positionKey, size)}
                      onRemoveOverride={() => {
// 移除override，回到默认配置
                        const overrides = group.perSizeOverrides || [];
                        const sizeOverride = overrides.find(o => o.size === size);
                        if (sizeOverride) {
                          const updatedOverrides = sizeOverride.overrides.filter(
                            p => p.positionKey !== positionKey
                          );
                          const otherOverrides = overrides.filter(o => o.size !== size);
                          onChange({
                            ...group,
                            perSizeOverrides: updatedOverrides.length > 0
                              ? [...otherOverrides, { size, overrides: updatedOverrides }]
                              : otherOverrides
                          });
                        }
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-gray-500">
        <p>• 绿色边框表示已覆盖默认配置</p>
        <p>• 点击单元格可编辑该尺码×位置的配置</p>
        <p>• 未覆盖的单元格继承颜色组的默认配置</p>
      </div>
    </div>
  );
}
