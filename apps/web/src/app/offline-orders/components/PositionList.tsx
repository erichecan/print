/**
* 印刷位置列表组件
 * 显示和编辑颜色组的默认印刷位置配置
 */
'use client';

import { useCallback } from 'react';
import { PositionConfig, PositionKey } from '@/types/order';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface PositionListProps {
  positions: PositionConfig[];
  onChange: (positions: PositionConfig[]) => void;
  onEdit?: (positionKey: PositionKey) => void;
  locale?: OfflineOrdersLocale;
}

export function PositionList({
  positions,
  onChange,
  onEdit,
  locale = 'en'
}: PositionListProps) {
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

  const allPositionKeys: PositionKey[] = ['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket', 'tag_inside', 'tag_outside', 'custom'];

  // 切换位置启用状态
  const handleTogglePosition = (positionKey: PositionKey) => {
    const existing = positions.find(p => p.positionKey === positionKey);
    if (existing) {
      // 如果存在，切换启用状态
      onChange(
        positions.map(p =>
          p.positionKey === positionKey
            ? { ...p, enabled: !p.enabled }
            : p
        )
      );
    } else {
      // 如果不存在，添加新位置（默认启用）
      onChange([
        ...positions,
        {
          positionKey,
          enabled: true,
          method: 'DTF',
          unitPrice: 0,
          widthMm: undefined,
          heightMm: undefined
        }
      ]);
    }
  };

  // 获取位置的显示信息
  const getPositionInfo = (positionKey: PositionKey) => {
    const config = positions.find(p => p.positionKey === positionKey);
    if (!config || !config.enabled) {
      return null;
    }

    const sizeInfo = config.widthMm && config.heightMm
      ? `${config.widthMm}×${config.heightMm}mm`
      : config.widthMm
        ? `${t('widthShort')}${config.widthMm}mm`
        : config.heightMm
          ? `${t('heightShort')}${config.heightMm}mm`
          : t('notSet');

    return {
      method: config.method,
      size: sizeInfo,
      price: config.unitPrice,
      dstFileFee: config.dstFileFee || 0,
      hasFile: !!config.designAssetId
    };
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-3">{t('printPositionsTitle')}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {allPositionKeys.map((key) => {
          const config = positions.find(p => p.positionKey === key);
          const isEnabled = config?.enabled || false;
          const info = getPositionInfo(key);

          return (
            <div
              key={key}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${isEnabled
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              onClick={() => handleTogglePosition(key)}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleTogglePosition(key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {POSITION_LABELS[key]}
                  </span>
                </label>
                {isEnabled && onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(key);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    {t('edit')}
                  </button>
                )}
              </div>
              {isEnabled && info && (
                <div className="text-xs text-gray-600 space-y-1 mt-2">
                  <div>{t('methodLabel')}: {t(`method${info.method}` as any) || info.method}</div>
                  <div>{t('sizeLabelAlt')}: {info.size}</div>
                  {/* Only show Unit Price if > 0 */}
                  {info.price > 0 && (
                    <div>{t('unitPriceLabel')}: ${info.price.toFixed(2)}</div>
                  )}
                  {/* Show DST Fee if exists and > 0 */}
                  {info.dstFileFee > 0 && (
                    <div className="text-blue-600">{t('dstFeeLabel')}: ${info.dstFileFee.toFixed(2)}</div>
                  )}
                  {info.hasFile && (
                    <div className="text-green-600">{t('fileUploaded')}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
