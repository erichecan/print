/**
 * [2025-12-19] 印刷位置面板组件
 * 显示在颜色卡片内，紧贴尺码表下方
 */
'use client';

import { useState } from 'react';
import { PositionConfig, PositionKey } from '@/types/order';
import { PositionEditorModal } from './PositionEditorModal';

interface PrintPositionsPanelProps {
  positions: PositionConfig[];
  onChange: (positions: PositionConfig[]) => void;
  onCopyToOthers?: () => void;
}

const POSITION_KEYS: PositionKey[] = ['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket', 'tag_inside', 'tag_outside', 'custom'];
const POSITION_LABELS: Record<PositionKey, string> = {
  front: '正面',
  back: '背面',
  left_sleeve: '左袖',
  right_sleeve: '右袖',
  pocket: '口袋',
  tag_inside: '内标',
  tag_outside: '外标',
  custom: '其他位置'
};

const PRINT_METHODS = [
  { value: 'DTF', label: 'DTF' },
  { value: 'Screen', label: '丝网印刷' },
  { value: 'Embroidery', label: '刺绣' },
  { value: 'UV', label: 'UV印刷' },
  { value: 'Vinyl', label: '胶膜' },
  { value: '其他', label: '其他' }
] as const;

export function PrintPositionsPanel({ positions, onChange, onCopyToOthers }: PrintPositionsPanelProps) {
  const [editingPosition, setEditingPosition] = useState<PositionKey | null>(null);
  const [selectedPositionKey, setSelectedPositionKey] = useState<PositionKey | ''>('');

  // [2025-12-19] 添加位置
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

  // [2025-12-19] 更新位置
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

  // [2025-12-19] 删除位置
  const handleRemovePosition = (key: PositionKey) => {
    onChange(positions.filter(p => p.positionKey !== key));
  };

  // [2025-12-19] 切换位置启用状态
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
        <h4 className="text-sm font-semibold text-gray-700">印刷位置（Print Positions）</h4>
        {onCopyToOthers && (
          <button
            type="button"
            onClick={onCopyToOthers}
            className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            复制到其它颜色
          </button>
        )}
      </div>

      {/* [2025-12-19] 位置选择下拉 */}
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
          <option value="" disabled>选择位置</option>
          {POSITION_KEYS.map((key) => {
            const exists = positions.find(p => p.positionKey === key);
            return (
              <option key={key} value={key} disabled={!!exists}>
                {POSITION_LABELS[key]} {exists ? '(已添加)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* [2025-12-19] 已选位置列表 */}
      {positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {positions.map((pos) => (
            <div
              key={pos.positionKey}
              className={`border rounded-lg p-3 ${
                pos.enabled
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
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePosition(pos.positionKey)}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              </div>
              {pos.enabled && (
                <div className="text-xs text-gray-600 space-y-1 mt-2">
                  <div>工艺: {pos.method}</div>
                  {pos.widthMm && pos.heightMm && (
                    <div>尺寸: {pos.widthMm}×{pos.heightMm}mm</div>
                  )}
                  {pos.designAssetId && (
                    <div className="text-green-600">✓ 已上传文件</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          暂无印刷位置，请从上方下拉菜单选择
        </div>
      )}

      {/* [2025-12-19] 位置编辑弹窗 */}
      {editingPosition && (
        <PositionEditorModal
          positionKey={editingPosition}
          initialConfig={positions.find(p => p.positionKey === editingPosition) || undefined}
          onSave={handleUpdatePosition}
          onCancel={() => setEditingPosition(null)}
        />
      )}
    </div>
  );
}
