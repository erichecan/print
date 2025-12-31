/**
* 位置单元格组件
 * 在矩阵中显示单个尺码×位置的配置状态
 */
'use client';

import { PositionConfig } from '@/types/order';

interface PositionCellProps {
  config: PositionConfig | null;
  defaultConfig?: PositionConfig | null;
  overridden: boolean;
  onEdit: () => void;
  onRemoveOverride?: () => void;
}

export function PositionCell({
  config,
  defaultConfig,
  overridden,
  onEdit,
  onRemoveOverride
}: PositionCellProps) {
  if (!config || !config.enabled) {
    return (
      <div
        className="text-center py-2 text-gray-400 text-xs cursor-pointer hover:bg-gray-100 rounded"
        onClick={onEdit}
      >
        未设置
      </div>
    );
  }

  const sizeInfo = config.widthMm && config.heightMm
    ? `${config.widthMm}×${config.heightMm}mm`
    : config.widthMm
    ? `宽${config.widthMm}mm`
    : config.heightMm
    ? `高${config.heightMm}mm`
    : '未设置尺寸';

  return (
    <div
      className={`p-2 rounded cursor-pointer transition-all ${
        overridden
          ? 'border-2 border-green-500 bg-green-50 hover:bg-green-100'
          : 'border border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={onEdit}
    >
      <div className="text-xs space-y-1">
        <div className="font-medium text-gray-900">{config.method}</div>
        <div className="text-gray-600">{sizeInfo}</div>
        <div className="text-blue-600 font-semibold">${config.unitPrice.toFixed(2)}</div>
        {config.designAssetId && (
          <div className="text-green-600 text-[10px]">✓ 有文件</div>
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
            取消覆盖
          </button>
        )}
      </div>
    </div>
  );
}
