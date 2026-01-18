import { useCallback } from 'react';
import { PositionConfig } from '@/types/order';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface PositionCellProps {
  config: PositionConfig | null;
  defaultConfig?: PositionConfig | null;
  overridden: boolean;
  onEdit: () => void;
  onRemoveOverride?: () => void;
  locale?: OfflineOrdersLocale;
}

export function PositionCell({
  config,
  defaultConfig,
  overridden,
  onEdit,
  onRemoveOverride,
  locale = 'en'
}: PositionCellProps) {
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
  if (!config || !config.enabled) {
    return (
      <div
        className="text-center py-2 text-gray-400 text-xs cursor-pointer hover:bg-gray-100 rounded"
        onClick={onEdit}
      >
        {t('notSet')}
      </div>
    );
  }

  const sizeInfo = config.widthMm && config.heightMm
    ? `${config.widthMm}×${config.heightMm}mm`
    : config.widthMm
      ? `${t('widthShort')}${config.widthMm}mm`
      : config.heightMm
        ? `${t('heightShort')}${config.heightMm}mm`
        : t('notSet');

  return (
    <div
      className={`p-2 rounded cursor-pointer transition-all ${overridden
        ? 'border-2 border-green-500 bg-green-50 hover:bg-green-100'
        : 'border border-gray-200 bg-white hover:bg-gray-50'
        }`}
      onClick={onEdit}
    >
      <div className="text-xs space-y-1">
        <div className="font-medium text-gray-900">
          {t(`method${config.method}` as any) || config.method}
        </div>
        <div className="text-gray-600">{sizeInfo}</div>
        <div className="text-blue-600 font-semibold">${config.unitPrice.toFixed(2)}</div>
        {config.designAssetId && (
          <div className="text-green-600 text-[10px]">{t('fileUploaded')}</div>
        )}
        {overridden && onRemoveOverride && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveOverride?.();
            }}
            className="mt-1 text-[10px] text-red-600 hover:text-red-700 underline"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
