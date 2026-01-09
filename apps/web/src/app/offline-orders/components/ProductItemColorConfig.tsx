/**
* 产品项颜色配置组件
 * 处理单个产品项的颜色组配置初始化和显示
 */
'use client';

import { useEffect, useMemo } from 'react';
import { OrderItemColorGroup } from '@/types/order';
import { OrderItemConfigurator } from './OrderItemConfigurator';
import { convertProductColorsToColorGroups } from './utils/colorGroupConverter';
import { OfflineOrdersLocale } from '@/translations/offlineOrders';

interface ProductItemColorConfigProps {
  productItemId: string;
  productName: string;
  colors: Array<{
    colorId: string;
    colorName: string;
    availableSizes: string[];
    sizes: Array<{
      size: string;
      quantity: number;
      unitPrice: number;
      additionalFee: number;
      subtotal: number;
    }>;
    totalQuantity: number;
    totalPrice: number;
  }>;
  existingGroups: OrderItemColorGroup[];
  onUpdate: (groups: OrderItemColorGroup[]) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  locale?: OfflineOrdersLocale;
}

export function ProductItemColorConfig({
  productItemId,
  productName,
  colors,
  existingGroups,
  onUpdate,
  onValidationChange,
  locale = 'en'
}: ProductItemColorConfigProps) {
  // 初始化颜色组（如果不存在）
  useEffect(() => {
    if (existingGroups.length === 0 && colors.length > 0) {
      const newGroups = convertProductColorsToColorGroups(colors as any, []);
      if (newGroups.length > 0) {
        onUpdate(newGroups);
      }
    }
  }, [productItemId, colors.length, existingGroups.length, onUpdate]);

  // 使用现有的颜色组，如果不存在则从colors转换
  const colorGroups = useMemo(() => {
    if (existingGroups.length > 0) {
      return existingGroups;
    }
    return convertProductColorsToColorGroups(colors as any, []);
  }, [existingGroups, colors]);

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{productName}</h3>
      <OrderItemConfigurator
        productItemId={productItemId}
        colorGroups={colorGroups}
        onUpdate={onUpdate}
        onValidationChange={onValidationChange}
        locale={locale}
      />
    </div>
  );
}
