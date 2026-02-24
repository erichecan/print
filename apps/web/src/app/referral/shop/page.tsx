/**
 * Referral 商品页 - 选商品，加入购物车 / 直接购买
 * 流程简短，尽快引导付款
 * 2026-02-21 创建
 */
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const REF_STORAGE_KEY = 'referral_ref';
const CART_STORAGE_KEY = 'referral_cart';

export interface ReferralCartItem {
  id: string;
  name: string;
  price: number;
}

const MOCK_PRODUCTS: ReferralCartItem[] = [
  { id: 'p1', name: '高端服务套餐（牙齿美白 / VIP 黑卡等）', price: 1000 },
  { id: 'p2', name: '轻量体验包', price: 299 },
];

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  const addToCart = (item: ReferralCartItem) => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CART_STORAGE_KEY) : null;
    const cart: ReferralCartItem[] = raw ? JSON.parse(raw) : [];
    cart.push(item);
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    router.push(ref ? `/referral/cart?ref=${encodeURIComponent(ref)}` : '/referral/cart');
  };

  const buyNow = (item: ReferralCartItem) => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify([item]));
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    router.push(`/referral/checkout${qs}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">选择商品</h1>
        <Link
          href={ref ? `/referral/cart?ref=${encodeURIComponent(ref)}` : '/referral/cart'}
          className="text-indigo-600 hover:text-indigo-700 text-sm"
        >
          购物车
        </Link>
      </div>

      <ul className="space-y-4">
        {MOCK_PRODUCTS.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-slate-800">{p.name}</p>
            <p className="text-lg font-bold text-indigo-600 mt-1">${p.price}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => addToCart(p)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                加入购物车
              </button>
              <button
                type="button"
                onClick={() => buyNow(p)}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                直接购买
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link href="/referral" className="text-indigo-600 hover:text-indigo-700 text-sm">
          ← 返回活动页
        </Link>
      </div>
    </div>
  );
}

export default function ReferralShopPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">加载中...</div>}>
      <ShopContent />
    </Suspense>
  );
}
