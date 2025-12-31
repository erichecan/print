// 颜色印刷配置卡片组件

'use client';

import React, { useMemo } from 'react';
import type { OrderItemColorInput, PrintConfig } from '@/types/order';
import { defaultTemplateFor } from './templates';

interface ColorPrintCardProps {
  color: OrderItemColorInput;
  prevColor?: OrderItemColorInput;
  onChange: (c: OrderItemColorInput) => void;
}

export function ColorPrintCard({ color, prevColor, onChange }: ColorPrintCardProps) {
  /**
* 复制上一颜色的配置
   */
  const copyPrev = () => {
    if (!prevColor) return;
    try {
      onChange({
        ...color,
        printConfigs: prevColor.printConfigs,
        sizeBreakdown: prevColor.sizeBreakdown,
      });
    } catch (e) {
      console.error('[PrintStep] copyPrev failed', e);
    }
  };

  /**
* 应用模板配置
   */
  const applyTemplate = (name: string) => {
    try {
      const template = defaultTemplateFor(
        name as 'front_small_chest' | 'back_full' | 'left_sleeve' | 'right_sleeve' | 'inside_tag'
      );
      onChange({ ...color, printConfigs: template });
    } catch (e) {
      console.error('[PrintStep] applyTemplate failed', e);
    }
  };

  /**
* 切换高级模式（允许尺码覆盖）
   */
  const toggleOverrides = (checked: boolean) => {
    onChange({ ...color, allowSizeOverrides: checked });
  };

  return (
    <div className="rounded border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <b>{color.colorName}</b>
        {prevColor && (
          <button
            type="button"
            onClick={copyPrev}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            复制上一颜色
          </button>
        )}
      </div>

      {/* 模板快捷按钮 */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => applyTemplate('front_small_chest')}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
        >
          Front Small Chest
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('back_full')}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
        >
          Back Full
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('left_sleeve')}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
        >
          Left Sleeve
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('right_sleeve')}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
        >
          Right Sleeve
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('inside_tag')}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
        >
          Inside Tag
        </button>
      </div>

      {/* 高级模式开关 */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!color.allowSizeOverrides}
          onChange={(e) => toggleOverrides(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm">
          允许按尺码覆盖印刷位设置（高级）
        </span>
      </label>

      {/* 尺码覆盖列表 */}
      {color.allowSizeOverrides && (
        <SizeOverridesList color={color} onChange={onChange} />
      )}
    </div>
  );
}

interface SizeOverridesListProps {
  color: OrderItemColorInput;
  onChange: (c: OrderItemColorInput) => void;
}

function SizeOverridesList({ color, onChange }: SizeOverridesListProps) {
  /**
* 设置尺码覆盖配置
   */
  const setOverride = (sizeCode: string, cfgs: PrintConfig[]) => {
    const next = {
      ...color,
      sizeOverrides: [
        ...(color.sizeOverrides || []).filter((s) => s.sizeCode !== sizeCode),
        { sizeCode, overridePrintConfigs: cfgs },
      ],
    };
    onChange(next);
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm text-gray-600 mb-2">
        为特定尺码设置不同的印刷位配置：
      </p>
      {(color.sizeBreakdown || []).map((s) => {
        const override = color.sizeOverrides?.find((o) => o.sizeCode === s.sizeCode);
        return (
          <div key={s.sizeCode} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">
              {s.sizeCode}（{s.qty}件）
            </span>
            <button
              type="button"
              onClick={() => setOverride(s.sizeCode, color.printConfigs)}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded"
            >
              {override ? '已覆盖' : '复制默认到该尺码'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
