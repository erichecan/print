/**
 * Referral 商品展示 Hero
 * $1000 高端服务套餐
 * 2025-02-20 创建
 */
'use client';

import { PRODUCT_PRICE } from '@/types/referral';

export function ProductHero() {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5">
      <h2 className="text-base font-semibold text-white mb-1">$1000 高端服务套餐</h2>
      <p className="text-xs text-[#666] mb-1">
        高级牙齿美白套餐 / 餐厅 VIP 黑卡等本地服务
      </p>
      <p className="text-2xl font-bold text-[#F5A623]">${PRODUCT_PRICE.toLocaleString()}</p>
    </div>
  );
}
