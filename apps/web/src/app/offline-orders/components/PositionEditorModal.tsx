/**
 * [2025-12-19] 位置编辑弹窗组件
 * 用于编辑单个印刷位置的详细配置
 */
'use client';

import { useState, useEffect } from 'react';
import { PositionConfig, PositionKey } from '@/types/order';

interface PositionEditorModalProps {
  positionKey: PositionKey;
  size?: string; // [2025-12-19] 如果提供，表示编辑per-size override
  initialConfig?: PositionConfig | null;
  defaultConfig?: PositionConfig | null; // [2025-12-19] 默认配置（用于per-size override时显示）
  onSave: (config: PositionConfig) => void;
  onCancel: () => void;
}

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

export function PositionEditorModal({
  positionKey,
  size,
  initialConfig,
  defaultConfig,
  onSave,
  onCancel
}: PositionEditorModalProps) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
  const [method, setMethod] = useState<PositionConfig['method']>(
    initialConfig?.method || defaultConfig?.method || 'DTF'
  );
  const [widthMm, setWidthMm] = useState<string>(
    initialConfig?.widthMm?.toString() || defaultConfig?.widthMm?.toString() || ''
  );
  const [heightMm, setHeightMm] = useState<string>(
    initialConfig?.heightMm?.toString() || defaultConfig?.heightMm?.toString() || ''
  );
  const [inkOrFilm, setInkOrFilm] = useState(initialConfig?.inkOrFilm || defaultConfig?.inkOrFilm || '');
  // [2025-01-30 11:15:00] 移除单价字段（非必填，已移除）
  const [notes, setNotes] = useState(initialConfig?.notes || defaultConfig?.notes || '');
  const [dstFileFee, setDstFileFee] = useState<string>(
    initialConfig?.dstFileFee?.toString() || defaultConfig?.dstFileFee?.toString() || ''
  );

  // [2025-12-19] 处理保存
  // [2025-01-30 11:15:00] 单价字段已移除，使用默认值0
  const handleSave = () => {
    const config: PositionConfig = {
      positionKey,
      enabled,
      method,
      unitPrice: 0, // [2025-01-30 11:15:00] 单价字段已移除，使用默认值0
      widthMm: widthMm ? parseFloat(widthMm) : undefined,
      heightMm: heightMm ? parseFloat(heightMm) : undefined,
      inkOrFilm: inkOrFilm || undefined,
      notes: notes || undefined,
      dstFileFee: dstFileFee ? parseFloat(dstFileFee) : undefined,
      designAssetId: initialConfig?.designAssetId || defaultConfig?.designAssetId || null
    };

    // [2025-12-19] 验证：至少需要宽度或高度
    if (!config.widthMm && !config.heightMm) {
      alert('请至少填写宽度或高度');
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
              编辑印刷位置：{POSITION_LABELS[positionKey]}
              {size && <span className="text-sm text-gray-500 ml-2">（尺码：{size}）</span>}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* [2025-12-19] 显示默认配置提示（如果是per-size override） */}
          {size && defaultConfig && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="font-medium text-blue-900 mb-1">默认配置：</div>
              <div className="text-blue-700">
                工艺: {defaultConfig.method} | 
                尺寸: {defaultConfig.widthMm && defaultConfig.heightMm 
                  ? `${defaultConfig.widthMm}×${defaultConfig.heightMm}mm`
                  : defaultConfig.widthMm 
                  ? `宽${defaultConfig.widthMm}mm`
                  : defaultConfig.heightMm
                  ? `高${defaultConfig.heightMm}mm`
                  : '未设置'}
                {/* [2025-01-30 11:15:00] 移除单价显示 */}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                下方设置将覆盖默认配置，未设置的字段将继承默认值
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* 启用开关 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">启用此位置</span>
            </label>

            {/* 工艺选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工艺 <span className="text-red-500">*</span>
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

            {/* 尺寸输入 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  宽度（mm）
                </label>
                <input
                  type="number"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：100"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  高度（mm）
                </label>
                <input
                  type="number"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：150"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            {/* 油墨/胶膜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                油墨/胶膜类型
              </label>
              <input
                type="text"
                value={inkOrFilm}
                onChange={(e) => setInkOrFilm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：白色油墨、透明胶膜"
              />
            </div>

            {/* [2025-01-30 11:15:00] 单价字段已移除（非必填） */}

            {/* DST File Fee（仅Embroidery） */}
            {method === 'Embroidery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DST File Fee（CAD）
                </label>
                <input
                  type="number"
                  value={dstFileFee}
                  onChange={(e) => setDstFileFee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="可选的备注信息..."
              />
            </div>

            {/* [2025-12-19] 文件上传（未来实现） */}
            <div className="text-sm text-gray-500">
              <p>文件上传功能将在后续版本中实现</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
