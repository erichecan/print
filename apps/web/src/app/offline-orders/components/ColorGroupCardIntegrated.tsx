/**
* 整合的颜色组卡片组件
 * 将尺码表和printPositions整合在一个卡片内，printPositions紧贴尺码表下方
 */
'use client';

import { useCallback, useState } from 'react';
import { OrderItemColorGroup, PositionKey } from '@/types/order';
import { PrintPositionsPanel } from './PrintPositionsPanel';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

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
  onSizeQuantityChange: (size: string, quantity: number) => void;
  colorHex?: string; // 颜色hex值（用于显示色块）
  // [2026-01-06] 从配置读取的尺码列表
  youthSizes?: string[];
  adultSizes?: string[];
  largeSizes?: string[];
  locale?: OfflineOrdersLocale;
}

// [2026-01-06] 移除硬编码尺码，改为从props传入
// 后备默认值（仅当props未提供时使用）
const DEFAULT_YOUTH_SIZES = ['YS', 'YM', 'YL'];
const DEFAULT_ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const DEFAULT_LARGE_SIZES = ['2XL', '3XL', '4XL', '5XL'];

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
  onSizeQuantityChange,
  colorHex,
  youthSizes = DEFAULT_YOUTH_SIZES,
  adultSizes = DEFAULT_ADULT_SIZES,
  largeSizes = DEFAULT_LARGE_SIZES,
  locale = 'en'
}: ColorGroupCardIntegratedProps) {
  const [showInheritConfirm, setShowInheritConfirm] = useState(false);

  // 翻译函数
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const translations = OFFLINE_ORDERS_TRANSLATIONS[locale] || OFFLINE_ORDERS_TRANSLATIONS.en;
    const fallback = OFFLINE_ORDERS_TRANSLATIONS.en;
    let text = translations[key] || fallback[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    return text;
  }, [locale]);

  // [2026-01-06] 确保尺码按照配置的display_order排序，并且只显示availableSizes中的尺码
  // 关键：youthSizes和adultSizes已经按display_order排序，我们只需要过滤availableSizes中的尺码，保持原有顺序
  // 使用Set来提高查找效率
  const availableSizesSet = new Set(availableSizes.length > 0 ? availableSizes : []);

  const filteredYouthSizes = availableSizes.length > 0
    ? youthSizes.filter(size => availableSizesSet.has(size))
    : youthSizes;

  const filteredAdultSizes = availableSizes.length > 0
    ? adultSizes.filter(size => availableSizesSet.has(size))
    : adultSizes;

  // 处理尺码数量变化
  const handleSizeQuantityChange = (size: string, quantity: number) => {
    onSizeQuantityChange(size, quantity);
    // 更新颜色组的quantities
    onUpdate({
      ...group,
      quantities: {
        ...group.quantities,
        [size]: quantity
      }
    });
  };

  // 继承上一颜色的positions
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

  // 获取颜色hex值（从props传入或使用默认值）
  const getColorHex = (): string => {
    return colorHex || '#CCCCCC'; // 使用传入的hex值或默认灰色
  };

  return (
    <section className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm mb-4 relative">
      {/* 颜色色块（2号位置）- 左侧8px宽色块，使用颜色hex值 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg"
        style={{ backgroundColor: getColorHex() }}
      />

      {/* 标题区：颜色名、删除按钮、继承按钮 */}
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 ml-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{group.colorName}</h3>
          <span className="text-sm text-gray-500">({group.colorCode})</span>
          {group.inheritsFromColorId && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {t('inherited')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 继承按钮（仅当有上一颜色且未继承时显示） */}
          {previousGroup && !group.inheritsFromColorId && (
            <button
              type="button"
              onClick={() => setShowInheritConfirm(true)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title={t('inheritConfirmTitle')}
            >
              {t('inheritPrevious')}
            </button>
          )}
          {/* 复制到其他颜色按钮 */}
          {onCopyToOthers && (
            <button
              type="button"
              onClick={onCopyToOthers}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title={t('copyTooltip')}
            >
              {t('copyToOthers')}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            {t('deleteColor')}
          </button>
        </div>
      </header>

      {/* 尺码表：YOUTH和ADULT两组 - 放在一行 */}
      <div className="mb-4 ml-2">
        <div className="flex flex-wrap gap-4">
          {/* YOUTH尺码 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('youthLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {filteredYouthSizes.map((size) => {
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
                      onKeyDown={(e) => {
                        // 修复：阻止Enter键触发表单提交
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      disabled={!isAvailable}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ADULT尺码 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adultLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {filteredAdultSizes.map((size) => {
                const isAvailable = isSizeAvailable(productItemId, group.colorCode, size);
                const quantity = group.quantities[size] || 0;
                const additionalFee = sizeFeeMap[size] || 0;

                return (
                  <div key={size} className={`flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                    <label className="block text-xs text-gray-600 mb-1">
                      {size}
                      {largeSizes.includes(size) && additionalFee > 0 && (
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
                      onKeyDown={(e) => {
                        // 修复：阻止Enter键触发表单提交
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      disabled={!isAvailable}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 单价和印刷位置：一行两列布局 */}
      <div className="ml-2 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 单价输入框 - 颜色级别单价 */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">
                {t('unitPriceLabel')}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={group.unitPrice > 0 ? group.unitPrice.toString() : ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  const unitPrice = isNaN(value) ? 0 : value;
                  onUpdate({
                    ...group,
                    unitPrice
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('unitPricePlaceholder')}
              />
            </label>
          </div>

          {/* printPositions面板 */}
          <div>
            <PrintPositionsPanel
              positions={group.positions}
              onChange={(positions) => onUpdate({ ...group, positions })}
              onCopyToOthers={onCopyToOthers}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* 继承确认弹窗 */}
      {showInheritConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('inheritConfirmTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('inheritConfirmDesc', { colorName: previousGroup?.colorName || '' })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowInheritConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleInheritPositions}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
