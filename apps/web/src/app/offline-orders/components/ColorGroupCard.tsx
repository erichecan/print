/**
 * [2025-12-19] 颜色组卡片组件
 * 显示和编辑单个颜色组的印刷位置配置
 */
'use client';

import { useState } from 'react';
import { OrderItemColorGroup, PositionKey } from '@/types/order';
import { SizePositionMatrix } from './SizePositionMatrix';
import { PositionList } from './PositionList';
import { PositionEditorModal } from './PositionEditorModal';

interface ColorGroupCardProps {
  group: OrderItemColorGroup;
  onUpdate: (updated: OrderItemColorGroup) => void;
  onInherit?: () => void; // [2025-12-19] 继承上一颜色的回调
  onCopyToOthers?: () => void; // [2025-12-19] 复制到其他颜色的回调
  previousGroup?: OrderItemColorGroup | null; // [2025-12-19] 上一个颜色组（用于继承）
}

export function ColorGroupCard({ 
  group, 
  onUpdate, 
  onInherit,
  onCopyToOthers,
  previousGroup 
}: ColorGroupCardProps) {
  const [perSizeEnabled, setPerSizeEnabled] = useState(!!group.perSizeOverrides?.length);
  const [editingPosition, setEditingPosition] = useState<{
    positionKey: PositionKey;
    size?: string;
  } | null>(null);

  // [2025-12-19] 切换per-size overrides模式
  const handleTogglePerSize = (enabled: boolean) => {
    setPerSizeEnabled(enabled);
    onUpdate({
      ...group,
      perSizeOverrides: enabled ? [] : undefined // 启用时初始化为空数组，禁用时移除
    });
  };

  // [2025-12-19] 更新位置列表
  const handlePositionsUpdate = (positions: typeof group.positions) => {
    onUpdate({
      ...group,
      positions
    });
  };

  // [2025-12-19] 处理继承上一颜色
  const handleInherit = () => {
    if (previousGroup && previousGroup.positions.length > 0) {
      // 复制位置配置（不复制文件二进制，仅引用）
      const inheritedPositions = previousGroup.positions.map(pos => ({
        ...pos,
        designAssetId: pos.designAssetId || null // 保留引用，但不复制文件
      }));
      
      onUpdate({
        ...group,
        positions: inheritedPositions,
        inheritFromPrevious: true
      });
    } else if (onInherit) {
      onInherit();
    }
  };

  // [2025-12-19] 打开位置编辑弹窗
  const handleEditPosition = (positionKey: PositionKey, size?: string) => {
    setEditingPosition({ positionKey, size });
  };

  // [2025-12-19] 保存位置编辑
  const handleSavePosition = (config: typeof group.positions[0]) => {
    if (editingPosition?.size) {
      // 更新per-size override
      const overrides = group.perSizeOverrides || [];
      const sizeOverride = overrides.find(o => o.size === editingPosition.size);
      const otherOverrides = overrides.filter(o => o.size !== editingPosition.size);
      
      const updatedOverrides = sizeOverride
        ? [
            ...otherOverrides,
            {
              ...sizeOverride,
              overrides: [
                ...sizeOverride.overrides.filter(p => p.positionKey !== config.positionKey),
                config
              ]
            }
          ]
        : [
            ...otherOverrides,
            {
              size: editingPosition.size,
              overrides: [config]
            }
          ];
      
      onUpdate({
        ...group,
        perSizeOverrides: updatedOverrides
      });
    } else {
      // 更新默认位置配置
      const updatedPositions = group.positions.find(p => p.positionKey === config.positionKey)
        ? group.positions.map(p => p.positionKey === config.positionKey ? config : p)
        : [...group.positions, config];
      
      onUpdate({
        ...group,
        positions: updatedPositions
      });
    }
    
    setEditingPosition(null);
  };

  // [2025-12-19] 检查是否有数量
  const hasQuantities = Object.values(group.quantities).some(qty => qty > 0);

  return (
    <section className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{group.colorName}</h3>
          <span className="text-sm text-gray-500">({group.colorCode})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* [2025-12-19] 继承上一颜色按钮 */}
          {previousGroup && (
            <button
              type="button"
              onClick={handleInherit}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title="继承上一颜色的印刷位置配置"
            >
              继承上一颜色
            </button>
          )}
          {/* [2025-12-19] 复制到其他颜色按钮 */}
          {onCopyToOthers && (
            <button
              type="button"
              onClick={onCopyToOthers}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title="将本颜色的设置复制到其他颜色"
            >
              复制到其他颜色
            </button>
          )}
        </div>
      </header>

      {/* [2025-12-19] Per-size overrides开关 */}
      {hasQuantities && (
        <div className="mb-4 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={perSizeEnabled}
              onChange={(e) => handleTogglePerSize(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              同色不同尺码印刷位（Per-size overrides）
            </span>
          </label>
        </div>
      )}

      {/* [2025-12-19] 根据模式显示不同的UI */}
      {!perSizeEnabled ? (
        <PositionList
          positions={group.positions}
          onChange={handlePositionsUpdate}
          onEdit={handleEditPosition}
        />
      ) : (
        <SizePositionMatrix
          group={group}
          onChange={onUpdate}
          onEdit={handleEditPosition}
        />
      )}

      {/* [2025-12-19] 位置编辑弹窗 */}
      {editingPosition && (
        <PositionEditorModal
          positionKey={editingPosition.positionKey}
          size={editingPosition.size}
          initialConfig={
            editingPosition.size
              ? group.perSizeOverrides?.find(o => o.size === editingPosition.size)
                  ?.overrides.find(p => p.positionKey === editingPosition.positionKey)
              : group.positions.find(p => p.positionKey === editingPosition.positionKey)
          }
          defaultConfig={
            !editingPosition.size
              ? undefined
              : group.positions.find(p => p.positionKey === editingPosition.positionKey)
          }
          onSave={handleSavePosition}
          onCancel={() => setEditingPosition(null)}
        />
      )}
    </section>
  );
}
