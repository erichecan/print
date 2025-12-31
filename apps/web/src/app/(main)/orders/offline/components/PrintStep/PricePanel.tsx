// 价格面板组件

'use client';

import React from 'react';
import type { PricingBreakdown, ValidationResult } from '@/types/order';

interface PricePanelProps {
  pricing?: PricingBreakdown;
  validation?: ValidationResult[];
}

export function PricePanel({ pricing, validation }: PricePanelProps) {
  if (!pricing) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-gray-500 text-sm">价格估算加载中...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">价格估算</h3>

      {/* 批次明细 */}
      <div className="space-y-2 mb-4">
        {pricing.batches.map((batch, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b pb-2">
            <div>
              <span className="font-medium">{batch.colorCode}</span>
              <span className="text-gray-500 ml-2">{batch.positionsKey}</span>
            </div>
            <div className="text-right">
              <div>
                {batch.totalQty} × ${batch.unitPrice.toFixed(2)}
              </div>
              <div className="font-medium">${batch.subtotal.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 总计 */}
      <div className="border-t pt-3 flex justify-between items-center">
        <span className="font-semibold">总计</span>
        <span className="text-xl font-bold">
          {pricing.currency} ${pricing.total.toFixed(2)}
        </span>
      </div>

      {/* 校验警告（仅 console，不弹窗） */}
      {validation && validation.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">校验提示：</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {validation.map((v, idx) => (
              <li key={idx} className={v.level === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                [{v.level}] {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
