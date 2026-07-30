/**
* 印刷位置面板组件
 * 显示在颜色卡片内，紧贴尺码表下方
 */
'use client';

import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  // Use ID to track which position is being edited (supporting multiple same-type positions)
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
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
    front: t('positionFront'),
    back: t('positionBack'),
    left_sleeve: t('positionLeftSleeve'),
    right_sleeve: t('positionRightSleeve'),
    pocket: t('positionPocket'),
    tag_inside: t('tag_inside'),
    tag_outside: t('tag_outside'),
    custom: t('positionOther'),
    front_left_chest: t('positionFrontLeftChest'),
    front_middle: t('positionFrontMiddle'),
    back_middle: t('positionBackMiddle')
  };

  // 添加位置
  const handleAddPosition = (key: PositionKey) => {
    // Generate a unique ID for the new position
    const newId = uuidv4();

    // Add new position (allow duplicates)
    const newPosition: PositionConfig = {
      id: newId,
      positionKey: key,
      enabled: true,
      method: 'DTF',
      unitPrice: 0,
      widthMm: undefined,
      heightMm: undefined
    };
    onChange([...positions, newPosition]);
    setSelectedPositionKey('');

    // Optional: Auto-open edit modal for new position?
    // setEditingPositionId(newId); 
  };

  // 更新位置
  const handleUpdatePosition = (updated: PositionConfig) => {
    // Find index by ID if available, otherwise fallback to finding by ref matching (less reliable if totally new obj)
    // Since we pass updated config from modal, it should have the ID.

    let index = -1;
    if (updated.id) {
      index = positions.findIndex(p => p.id === updated.id);
    }

    // Fallback for legacy positions without ID (shouldn't happen for new ones, but safety check)
    if (index === -1 && !updated.id) {
      // Only for legacy unique-key logic, but we are moving away from it.
      // Best effort: match by key if only one exists?
      // For now, assume ID exists or correct index logic
    }

    if (index === -1) {
      // Try finding by the editing ID state
      if (editingPositionId) {
        index = positions.findIndex(p => p.id === editingPositionId);
      }
    }

    if (index >= 0) {
      const newPositions = [...positions];
      // Ensure ID is preserved
      newPositions[index] = { ...updated, id: positions[index].id };
      onChange(newPositions);
    } else {
      // Should not happen usually for update
      onChange([...positions, updated]);
    }
    setEditingPositionId(null);
  };

  // 删除位置
  const handleRemovePosition = (id: string | undefined, key: PositionKey, index: number) => {
    if (id) {
      onChange(positions.filter(p => p.id !== id));
    } else {
      // Legacy fallback: remove by index
      const newPositions = [...positions];
      newPositions.splice(index, 1);
      onChange(newPositions);
    }
  };

  // 切换位置启用状态
  const handleToggleEnabled = (index: number) => {
    const newPositions = [...positions];
    newPositions[index] = { ...newPositions[index], enabled: !newPositions[index].enabled };
    onChange(newPositions);
  };

  // Determine which position configuration is currently being edited
  const editingConfig = editingPositionId
    ? positions.find(p => p.id === editingPositionId)
    : null;

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
          {POSITION_KEYS.map((key) => (
            <option key={key} value={key} className="p-1">
              {POSITION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* 已选位置列表 */}
      {positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {positions.map((pos, index) => {
            // Ensure we have a Stable Key. Use ID if available, otherwise composite key
            const listKey = pos.id || `${pos.positionKey}-${index}`;

            return (
              <div
                key={listKey}
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
                      onChange={() => handleToggleEnabled(index)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {POSITION_LABELS[pos.positionKey]}
                    </span>
                    {/* Debug ID display (optional, removing for prod) */}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      // Set editing ID if available, else standard index fallback isn't supported by legacy state
                      onClick={() => {
                        if (pos.id) {
                          setEditingPositionId(pos.id);
                        } else {
                          // If no ID (legacy data), we might need to assign one on the fly or just warn.
                          // For now, let's assume we won't edit legacy data without migration, or just simple reload.
                          // But to be safe, let's just generate one?
                          // Doing on-the-fly id assignment is tricky in render.
                          // Better: The legacy data migration should ideally happen upstream or we force it here if we really want.
                          // But for now, let's assume newly added ones have ID.
                          // If legacy has no ID, we can't easily edit it with this new modal logic relying on ID.
                          console.warn("Editing position without ID", pos);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      {t('btnEdit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(pos.id, pos.positionKey, index)}
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
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          {t('noPrintPositions')}
        </div>
      )}

      {/* 位置编辑弹窗 */}
      {editingConfig && (
        <PositionEditorModal
          positionKey={editingConfig.positionKey}
          initialConfig={editingConfig}
          onSave={handleUpdatePosition}
          onCancel={() => setEditingPositionId(null)}
          locale={locale}
        />
      )}
    </div>
  );
}
