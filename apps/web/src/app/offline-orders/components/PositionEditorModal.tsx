/**
* 位置编辑弹窗组件
 * 用于编辑单个印刷位置的详细配置
 */
'use client';

import { useCallback, useState, useEffect } from 'react';
import { PositionConfig, PositionKey } from '@/types/order';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface PositionEditorModalProps {
  positionKey: PositionKey;
  size?: string; // 如果提供，表示编辑per-size override
  initialConfig?: PositionConfig | null;
  defaultConfig?: PositionConfig | null; // 默认配置（用于per-size override时显示）
  onSave: (config: PositionConfig) => void;
  onCancel: () => void;
  locale?: OfflineOrdersLocale;
}

// 单位转换工具函数
const INCH_TO_MM = 25.4;
const mmToInch = (mm: number | undefined): string => {
  if (mm === undefined || mm === null || isNaN(mm)) return '';
  return (mm / INCH_TO_MM).toFixed(2);
};

const inchToMm = (inch: string): number | undefined => {
  const inchValue = parseFloat(inch);
  if (isNaN(inchValue) || inchValue < 0) return undefined;
  return Math.round(inchValue * INCH_TO_MM * 10) / 10; // 保留一位小数
};

export function PositionEditorModal({
  positionKey,
  size,
  initialConfig,
  defaultConfig,
  onSave,
  onCancel,
  locale = 'en'
}: PositionEditorModalProps) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
  const [method, setMethod] = useState<PositionConfig['method']>(
    initialConfig?.method || defaultConfig?.method || 'DTF'
  );

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
    front_left_chest: t('positionFrontLeftChest'),
    front_middle: t('positionFrontMiddle'),
    front: t('positionFront'),
    back_middle: t('positionBackMiddle'),
    back: t('positionBack'),
    left_sleeve: t('positionLeftSleeve'),
    right_sleeve: t('positionRightSleeve'),
    pocket: t('positionPocket'),
    tag_inside: t('tag_inside'),
    tag_outside: t('tag_outside'),
    custom: t('positionOther')
  };

  const PRINT_METHODS = [
    { value: 'DTF', label: t('methodDTF') },
    { value: 'Screen', label: t('methodScreen') },
    { value: 'Embroidery', label: t('methodEmbroidery') },
    { value: 'UV', label: t('methodUV') },
    { value: 'Vinyl', label: t('methodVinyl') },
    { value: '其他', label: t('methodOther') }
  ] as const;

  // 将输入单位改为 inch，内部仍存储 mm
  // 初始化时将 mm 转换为 inch 显示
  const [widthInch, setWidthInch] = useState<string>(() => {
    const mm = initialConfig?.widthMm || defaultConfig?.widthMm;
    return mmToInch(mm);
  });
  const [heightInch, setHeightInch] = useState<string>(() => {
    const mm = initialConfig?.heightMm || defaultConfig?.heightMm;
    return mmToInch(mm);
  });

  const [inkOrFilm, setInkOrFilm] = useState(initialConfig?.inkOrFilm || defaultConfig?.inkOrFilm || '');
  const [notes, setNotes] = useState(initialConfig?.notes || defaultConfig?.notes || '');
  const [dstFileFee, setDstFileFee] = useState<string>(
    initialConfig?.dstFileFee?.toString() || defaultConfig?.dstFileFee?.toString() || ''
  );

  // 计算显示用的 mm 值（从 inch 转换）
  const widthMmDisplay = widthInch ? inchToMm(widthInch) : undefined;
  const heightMmDisplay = heightInch ? inchToMm(heightInch) : undefined;

  const handleSave = () => {
    const config: PositionConfig = {
      id: initialConfig?.id, // Preserve ID
      positionKey,
      enabled,
      method,
      unitPrice: 0,
      widthMm: inchToMm(widthInch),
      heightMm: inchToMm(heightInch),
      inkOrFilm: inkOrFilm || undefined,
      notes: notes || undefined,
      dstFileFee: dstFileFee ? parseFloat(dstFileFee) : undefined,
      designAssetId: initialConfig?.designAssetId || defaultConfig?.designAssetId || null
    };

    if (!config.widthMm && !config.heightMm) {
      alert(t('atLeastOneDimension'));
      return;
    }

    onSave(config);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('editPositionTitle')}{POSITION_LABELS[positionKey]}
              {size && <span className="text-sm text-gray-500 ml-2">{t('sizeLabel', { size })}</span>}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {size && defaultConfig && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="font-medium text-blue-900 mb-1">{t('defaultConfigTitle')}</div>
              <div className="text-blue-700">
                {t('methodLabel')} {t(`method${defaultConfig.method}` as any) || defaultConfig.method} |
                {t('dimensionsLabel')} {defaultConfig.widthMm && defaultConfig.heightMm
                  ? `${defaultConfig.widthMm}×${defaultConfig.heightMm}mm`
                  : defaultConfig.widthMm
                    ? `${t('widthShort')}${defaultConfig.widthMm}mm`
                    : defaultConfig.heightMm
                      ? `${t('heightShort')}${defaultConfig.heightMm}mm`
                      : t('notSet')}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {t('overrideNotice')}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">{t('enablePosition')}</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('methodRequired')} <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PositionConfig['method'])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRINT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('widthInch')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={widthInch}
                    onChange={(e) => setWidthInch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g.: 4"
                    min="0"
                    step="0.01"
                  />
                  {widthInch && widthMmDisplay !== undefined && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                      {widthMmDisplay}mm
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('heightInch')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={heightInch}
                    onChange={(e) => setHeightInch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g.: 6"
                    min="0"
                    step="0.01"
                  />
                  {heightInch && heightMmDisplay !== undefined && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                      {heightMmDisplay}mm
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inkOrFilmLabel')}
              </label>
              <input
                type="text"
                value={inkOrFilm}
                onChange={(e) => setInkOrFilm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('inkOrFilmPlaceholder')}
              />
            </div>

            {method === 'Embroidery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DST File Fee（CAD）
                </label>
                <input
                  type="number"
                  value={dstFileFee}
                  onChange={(e) => setDstFileFee(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder={t('notesPlaceholder')}
              />
            </div>

            <div className="text-sm text-gray-500">
              <p>{t('fileUploadComingSoon')}</p>
            </div>
          </div>

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
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('btnSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
