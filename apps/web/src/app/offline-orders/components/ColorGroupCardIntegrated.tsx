/**
 * [2025-12-19] 整合的颜色组卡片组件
 * 将尺码表和printPositions整合在一个卡片内，printPositions紧贴尺码表下方
 */
'use client';

import { useState } from 'react';
import { OrderItemColorGroup, PositionKey } from '@/types/order';
import { PrintPositionsPanel } from './PrintPositionsPanel';

interface ColorGroupCardIntegratedProps {
  group: OrderItemColorGroup;
  productItemId: string;
  availableSizes: string[];
  sizeFeeMap: Record<string, number>;
  isSizeAvailable: (productId: string, colorId: string, size: string) => boolean;
  onUpdate: (updated: OrderItemColorGroup) => void;
  onRemove: () => void;
  onCopyToOthers?: () => void;
  previousGroup?: OrderItemColorGroup | null;
  globalUnitPrice: number;
  onSizeQuantityChange: (size: string, quantity: number) => void;
}

// [2025-12-19] 尺码定义（与page.tsx保持一致）
const YOUTH_SIZES = ['YS', 'YM', 'YL'];
const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const LARGE_SIZES = ['2XL', '3XL', '4XL', '5XL'];

export function ColorGroupCardIntegrated({
  group,
  productItemId,
  availableSizes,
  sizeFeeMap,
  isSizeAvailable,
  onUpdate,
  onRemove,
  onCopyToOthers,
  previousGroup,
  globalUnitPrice,
  onSizeQuantityChange
}: ColorGroupCardIntegratedProps) {
  const [showInheritConfirm, setShowInheritConfirm] = useState(false);

  // [2025-12-19] 处理尺码数量变化
  const handleSizeQuantityChange = (size: string, quantity: number) => {
    onSizeQuantityChange(size, quantity);
    // [2025-12-19] 更新颜色组的quantities
    onUpdate({
      ...group,
      quantities: {
        ...group.quantities,
        [size]: quantity
      }
    });
  };

  // [2025-12-19] 继承上一颜色的positions
  const handleInheritPositions = () => {
    if (previousGroup && previousGroup.positions.length > 0) {
      const inheritedPositions = previousGroup.positions.map(pos => ({
        ...pos,
        designAssetId: pos.designAssetId || null // 保留引用，不复制文件
      }));
      
      onUpdate({
        ...group,
        positions: inheritedPositions,
        inheritsFromColorId: previousGroup.id
      });
      setShowInheritConfirm(false);
    }
  };

  return (
    <section className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm mb-4">
      {/* [2025-12-19] 标题区：颜色名、删除按钮、继承按钮 */}
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{group.colorName}</h3>
          <span className="text-sm text-gray-500">({group.colorCode})</span>
          {group.inheritsFromColorId && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              已继承
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* [2025-12-19] 继承按钮（仅当有上一颜色且未继承时显示） */}
          {previousGroup && !group.inheritsFromColorId && (
            <button
              type="button"
              onClick={() => setShowInheritConfirm(true)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title="继承上一颜色的 print positions"
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
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            删除颜色
          </button>
        </div>
      </header>

      {/* [2025-12-19] 尺码表：YOUTH和ADULT两组 */}
      <div className="space-y-3 mb-4">
        {/* YOUTH尺码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">YOUTH（童装）</label>
          <div className="flex flex-wrap gap-2">
            {YOUTH_SIZES.map((size) => {
              const isAvailable = isSizeAvailable(productItemId, group.colorCode, size);
              const quantity = group.quantities[size] || 0;
              const additionalFee = sizeFeeMap[size] || 0;
              
              return (
                <div key={size} className={`flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                  <label className="block text-xs text-gray-600 mb-1">{size}</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity > 0 ? quantity : ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const qty = inputValue === '' ? 0 : (parseInt(inputValue, 10) || 0);
                      handleSizeQuantityChange(size, qty);
                    }}
                    disabled={!isAvailable}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="数量"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ADULT尺码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ADULT（成人）</label>
          <div className="flex flex-wrap gap-2">
            {ADULT_SIZES.map((size) => {
              const isAvailable = isSizeAvailable(productItemId, group.colorCode, size);
              const quantity = group.quantities[size] || 0;
              const additionalFee = sizeFeeMap[size] || 0;
              
              return (
                <div key={size} className={`flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {size}
                    {LARGE_SIZES.includes(size) && additionalFee > 0 && (
                      <span className="text-red-600 text-xs ml-1">+${additionalFee.toFixed(2)}</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity > 0 ? quantity : ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const qty = inputValue === '' ? 0 : (parseInt(inputValue, 10) || 0);
                      handleSizeQuantityChange(size, qty);
                    }}
                    disabled={!isAvailable}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="数量"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* [2025-12-19] printPositions面板：紧贴尺码表下方 */}
      <PrintPositionsPanel
        positions={group.positions}
        onChange={(positions) => onUpdate({ ...group, positions })}
        onCopyToOthers={onCopyToOthers}
      />

      {/* [2025-12-19] 继承确认弹窗 */}
      {showInheritConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">继承上一颜色的 print positions</h3>
            <p className="text-sm text-gray-600 mb-4">
              确定要继承"{previousGroup?.colorName}"的印刷位置配置吗？这将复制所有位置设置（不包含文件）。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowInheritConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleInheritPositions}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定继承
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
