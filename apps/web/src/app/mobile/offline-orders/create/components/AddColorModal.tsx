/**
* 添加颜色弹窗组件
 * 让用户选择是否继承上一颜色的print positions
 */
import { useCallback, useState } from 'react';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface AddColorModalProps {
  isOpen: boolean;
  previousColorName?: string;
  hasPreviousColor: boolean;
  onConfirm: (inheritFromPrev: boolean) => void;
  onCancel: () => void;
  locale?: OfflineOrdersLocale;
}

export function AddColorModal({
  isOpen,
  previousColorName,
  hasPreviousColor,
  onConfirm,
  onCancel,
  locale = 'en'
}: AddColorModalProps) {
  const [inheritFromPrev, setInheritFromPrev] = useState(true);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('addNewColorTitle')}</h3>

        {hasPreviousColor ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('inheritMethodLabel')}
            </p>

            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="inheritOption"
                checked={inheritFromPrev}
                onChange={() => setInheritFromPrev(true)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {t('inheritPrevious')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('inheritPrevColorDesc', { colorName: previousColorName || '' })}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="inheritOption"
                checked={!inheritFromPrev}
                onChange={() => setInheritFromPrev(false)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {t('startFromBlank')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('startFromBlankDesc')}
                </div>
              </div>
            </label>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            {t('firstColorNotice')}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(inheritFromPrev && hasPreviousColor)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
