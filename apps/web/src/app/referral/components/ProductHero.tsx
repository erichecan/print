/**
 * Referral 商品展示 Hero
 * $1000 高端服务套餐
 * 2025-02-20 创建
 */
'use client';

import { PRODUCT_PRICE } from '@/types/referral';

export function ProductHero() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-lg">
      <h2 className="text-xl font-semibold mb-1">$1000 高端服务套餐</h2>
      <p className="text-indigo-100 text-sm mb-4">
        高级牙齿美白套餐 / 餐厅 VIP 黑卡等本地服务
      </p>
      <p className="text-2xl font-bold">${PRODUCT_PRICE.toLocaleString()}</p>
    </div>
  );
}
