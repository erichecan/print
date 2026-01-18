/**
* 定价明细组件
 * 显示按颜色×尺码的详细定价信息
 */
'use client';

import { PricingCalculationResult } from '@/types/order';

interface PricingBreakdownProps {
  breakdown: PricingCalculationResult['breakdown'];
}

export function PricingBreakdown({ breakdown }: PricingBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
        暂无定价明细
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">定价明细</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">颜色</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">尺码</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">数量</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">印刷位置</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">小计</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {breakdown.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">{item.color}</td>
                <td className="px-4 py-2 text-gray-700">{item.size}</td>
                <td className="px-4 py-2 text-right text-gray-700">{item.quantity}</td>
                <td className="px-4 py-2 text-gray-600">
                  {item.positions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.positions.map((pos, pIdx) => (
                        <span
                          key={pIdx}
                          className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {pos.positionKey} {pos.unitPrice > 0 ? `($${pos.unitPrice.toFixed(2)})` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">无</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  ${item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
