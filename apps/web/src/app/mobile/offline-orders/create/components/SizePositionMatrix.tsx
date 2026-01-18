/**
* 尺码×位置矩阵组件
 * 在启用per-size overrides时显示，支持单元格级别的覆盖设置
 */
'use client';

import { useCallback } from 'react';
import { OrderItemColorGroup, PositionKey, PositionConfig } from '@/types/order';
import { PositionCell } from './PositionCell';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface SizePositionMatrixProps {
  group: OrderItemColorGroup;
  onChange: (updated: OrderItemColorGroup) => void;
  onEdit: (positionKey: PositionKey, size: string) => void;
  locale?: OfflineOrdersLocale;
}

export function SizePositionMatrix({
  group,
  onChange,
  onEdit,
  locale = 'en'
}: SizePositionMatrixProps) {
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

  const POSITION_LABELS: Record<PositionKey, string> = {
    front: t('positionFront'),
    back: t('positionBack'),
    left_sleeve: t('positionLeftSleeve'),
    right_sleeve: t('positionRightSleeve'),
    pocket: t('positionPocket'),
    tag_inside: t('tag_inside'),
    tag_outside: t('tag_outside'),
    custom: t('positionOther')
  };
  // 获取有数量的尺码列表
  const sizesWithQty = Object.entries(group.quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([size]) => size)
    .sort();

  if (sizesWithQty.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        {t('noQtyNotice')}
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
        {t('matrixTitle')}
      </div>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
              {t('sizeSlashPosition')}
            </th>
            {['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket'].map((key) => (
              <th
                key={key}
                className="border border-gray-300 px-3 py-2 text-center font-semibold min-w-[120px]"
              >
                {POSITION_LABELS[key as PositionKey]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizesWithQty.map((size) => (
            <tr key={size} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">
                {size} ({group.quantities[size]}{t('qtyUnit')})
              </td>
              {['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket'].map((positionKeyStr) => {
                const positionKey = positionKeyStr as PositionKey;
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
                      locale={locale}
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
        <p>{t('greenBorderNotice')}</p>
        <p>{t('clickCellNotice')}</p>
        <p>{t('inheritDefaultNotice')}</p>
      </div>
    </div>
  );
}
