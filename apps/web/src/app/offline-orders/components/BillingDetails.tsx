/**
 * [2025-12-19 02:30:00] 计费明细组件
 * 显示购物小票样式的计费明细，每个"产品包"一行
 */
'use client';

import { OrderItemColorGroup } from '@/types/order';

interface BillingItem {
  productName: string;
  colorName: string;
  size: string;
  quantity: number;
  positions: string; // "Front, Back" 格式
  unitPrice: number;
  subtotal: number;
}

interface BillingDetailsProps {
  productItems: Array<{
    id: string;
    productName: string;
    colors: Array<{
      colorId: string;
      colorName: string;
      sizes: Array<{
        size: string;
        quantity: number;
        unitPrice: number;
        additionalFee: number;
        subtotal: number;
      }>;
    }>;
  }>;
  colorGroupsByProduct: Record<string, OrderItemColorGroup[]>;
}

export function BillingDetails({ productItems, colorGroupsByProduct }: BillingDetailsProps) {
  // [2025-12-19 02:30:00] 生成计费明细数据
  const billingItems: BillingItem[] = [];

  productItems.forEach((item) => {
    const colorGroups = colorGroupsByProduct[item.id] || [];
    
    item.colors.forEach((color) => {
      const colorGroup = colorGroups.find(g => g.colorCode === color.colorId);
      
      color.sizes.forEach((sizeData) => {
        if (sizeData.quantity > 0) {
          // [2025-12-19 02:30:00] 获取印刷位置名称
          const positions = colorGroup?.positions
            .filter(p => p.enabled)
            .map(p => {
              // 将 positionKey 转换为可读名称
              const positionNames: Record<string, string> = {
                'front': 'Front',
                'back': 'Back',
                'left_sleeve': 'Left Sleeve',
                'right_sleeve': 'Right Sleeve',
                'pocket': 'Pocket',
                'tag_inside': 'Tag Inside',
                'tag_outside': 'Tag Outside',
                'custom': 'Custom'
              };
              return positionNames[p.positionKey] || p.positionKey;
            })
            .join(', ') || '无位置';

          billingItems.push({
            productName: item.productName,
            colorName: color.colorName,
            size: sizeData.size,
            quantity: sizeData.quantity,
            positions,
            unitPrice: sizeData.unitPrice,
            subtotal: sizeData.subtotal
          });
        }
      });
    });
  });

  if (billingItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-5 bg-white border border-gray-200 rounded-lg">
      <h4 className="text-base font-semibold text-gray-900 m-0 mb-4">计费明细</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">产品</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">颜色</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">尺码</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">数量</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">位置</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">单价</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">小计</th>
            </tr>
          </thead>
          <tbody>
            {billingItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-900">{item.productName}</td>
                <td className="py-2 px-3 text-gray-700">{item.colorName}</td>
                <td className="py-2 px-3 text-gray-700">{item.size}</td>
                <td className="py-2 px-3 text-right text-gray-700">{item.quantity}</td>
                <td className="py-2 px-3 text-gray-600 text-xs">{item.positions}</td>
                <td className="py-2 px-3 text-right text-gray-700">${item.unitPrice.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-medium text-gray-900">${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

