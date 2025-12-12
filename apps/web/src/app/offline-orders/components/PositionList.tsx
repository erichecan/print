/**
 * [2025-12-19] 印刷位置列表组件
 * 显示和编辑颜色组的默认印刷位置配置
 */
'use client';

import { PositionConfig, PositionKey } from '@/types/order';

interface PositionListProps {
  positions: PositionConfig[];
  onChange: (positions: PositionConfig[]) => void;
  onEdit?: (positionKey: PositionKey) => void;
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

export function PositionList({ positions, onChange, onEdit }: PositionListProps) {
  const allPositionKeys: PositionKey[] = ['front', 'back', 'left_sleeve', 'right_sleeve', 'pocket', 'tag_inside', 'tag_outside', 'custom'];

  // [2025-12-19] 切换位置启用状态
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

  // [2025-12-19] 获取位置的显示信息
  const getPositionInfo = (positionKey: PositionKey) => {
    const config = positions.find(p => p.positionKey === positionKey);
    if (!config || !config.enabled) {
      return null;
    }
    
    const sizeInfo = config.widthMm && config.heightMm
      ? `${config.widthMm}×${config.heightMm}mm`
      : config.widthMm
      ? `宽${config.widthMm}mm`
      : config.heightMm
      ? `高${config.heightMm}mm`
      : '未设置尺寸';
    
    return {
      method: config.method,
      size: sizeInfo,
      price: config.unitPrice,
      hasFile: !!config.designAssetId
    };
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-3">印刷位置配置：</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {allPositionKeys.map((key) => {
          const config = positions.find(p => p.positionKey === key);
          const isEnabled = config?.enabled || false;
          const info = getPositionInfo(key);

          return (
            <div
              key={key}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                isEnabled
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
                    编辑
                  </button>
                )}
              </div>
              {isEnabled && info && (
                <div className="text-xs text-gray-600 space-y-1 mt-2">
                  <div>工艺: {info.method}</div>
                  <div>尺寸: {info.size}</div>
                  <div>单价: ${info.price.toFixed(2)}</div>
                  {info.hasFile && (
                    <div className="text-green-600">✓ 已上传文件</div>
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
