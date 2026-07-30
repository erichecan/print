/**
* 印刷位置面板组件
 * 显示在颜色卡片内，紧贴尺码表下方
 */
'use client';

import { useCallback, useState } from 'react';
import { PositionConfig, PositionKey, POSITION_KEYS } from '@/types/order';
import { PositionEditorModal } from './PositionEditorModal';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';

interface PrintPositionsPanelProps {
  positions: PositionConfig[];
  onChange: (positions: PositionConfig[]) => void;
  onCopyToOthers?: () => void;
  locale?: OfflineOrdersLocale;
}

export function PrintPositionsPanel({ positions, onChange, onCopyToOthers, locale = 'en' }: PrintPositionsPanelProps) {
  const [editingPosition, setEditingPosition] = useState<PositionKey | null>(null);
  const [selectedPositionKey, setSelectedPositionKey] = useState<PositionKey | ''>('');

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

  // 添加位置
  const handleAddPosition = (key: PositionKey) => {
    const exists = positions.find(p => p.positionKey === key);
    if (exists) {
      // 如果已存在，打开编辑弹窗
      setEditingPosition(key);
      return;
    }

    // 添加新位置
    const newPosition: PositionConfig = {
      positionKey: key,
      enabled: true,
      method: 'DTF',
      unitPrice: 0,
      widthMm: undefined,
      heightMm: undefined
    };
    onChange([...positions, newPosition]);
    setSelectedPositionKey('');
  };

  // 更新位置
  const handleUpdatePosition = (updated: PositionConfig) => {
    const index = positions.findIndex(p => p.positionKey === updated.positionKey);
    if (index >= 0) {
      const newPositions = [...positions];
      newPositions[index] = updated;
      onChange(newPositions);
    } else {
      onChange([...positions, updated]);
    }
    setEditingPosition(null);
  };

  // 删除位置
  const handleRemovePosition = (key: PositionKey) => {
    onChange(positions.filter(p => p.positionKey !== key));
  };

  // 切换位置启用状态
  const handleToggleEnabled = (key: PositionKey) => {
    const index = positions.findIndex(p => p.positionKey === key);
    if (index >= 0) {
      const newPositions = [...positions];
      newPositions[index] = { ...newPositions[index], enabled: !newPositions[index].enabled };
      onChange(newPositions);
    }
  };

  return (
    <div className="print-positions border-t border-dashed border-gray-300 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">{t('printPositionsTitle')}</h4>
        {onCopyToOthers && (
          <button
            type="button"
            onClick={onCopyToOthers}
            className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            {t('copyToOthers')}
          </button>
        )}
      </div>

      {/* 位置选择下拉 */}
      <div className="mb-3">
        <select
          value={selectedPositionKey}
          onChange={(e) => {
            const key = e.target.value as PositionKey;
            if (key) {
              handleAddPosition(key);
            }
          }}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>{t('selectPosition')}</option>
          {POSITION_KEYS.map((key) => {
            const exists = positions.find(p => p.positionKey === key);
            return (
              <option key={key} value={key} disabled={!!exists} className="p-1">
                {POSITION_LABELS[key]} {exists ? t('alreadyAdded') : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* 已选位置列表 */}
      {positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {positions.map((pos) => (
            <div
              key={pos.positionKey}
              className={`border rounded-lg p-3 ${pos.enabled
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={pos.enabled}
                    onChange={() => handleToggleEnabled(pos.positionKey)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {POSITION_LABELS[pos.positionKey]}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPosition(pos.positionKey)}
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    {t('btnEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePosition(pos.positionKey)}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100"
                  >
                    {t('btnDelete')}
                  </button>
                </div>
              </div>
              {pos.enabled && (
                <div className="text-xs text-gray-600 space-y-1 mt-2">
                  <div>{t('methodLabel')} {t(`method${pos.method}` as any) || pos.method}</div>
                  {pos.widthMm && pos.heightMm && (
                    <div>{t('dimensionsLabel')} {pos.widthMm}×{pos.heightMm}mm</div>
                  )}
                  {pos.designAssetUrl && (
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={pos.designAssetUrl}
                        alt={t('designImageLabel')}
                        className="w-10 h-10 object-cover rounded border border-gray-300"
                      />
                      <span className="text-green-600">{t('fileUploaded')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          {t('noPrintPositions')}
        </div>
      )}

      {/* 位置编辑弹窗 */}
      {editingPosition && (
        <PositionEditorModal
          positionKey={editingPosition}
          initialConfig={positions.find(p => p.positionKey === editingPosition) || undefined}
          onSave={handleUpdatePosition}
          onCancel={() => setEditingPosition(null)}
          locale={locale}
        />
      )}
    </div>
  );
}
