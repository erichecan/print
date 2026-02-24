/**
 * Referral 购物车 - 去结算
 * 2026-02-21 创建
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ReferralCartItem } from '../shop/page';

const CART_STORAGE_KEY = 'referral_cart';
const REF_STORAGE_KEY = 'referral_ref';

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref');
  const [cart, setCart] = useState<ReferralCartItem[]>([]);

  useEffect(() => {
    if (ref && typeof window !== 'undefined') sessionStorage.setItem(REF_STORAGE_KEY, ref);
  }, [ref]);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CART_STORAGE_KEY) : null;
    setCart(raw ? JSON.parse(raw) : []);
  }, []);

  const total = cart.reduce((s, i) => s + i.price, 0);

  const goCheckout = () => {
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    router.push(`/referral/checkout${qs}`);
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-slate-600 mb-4">购物车是空的</p>
        <Link
          href={ref ? `/referral/shop?ref=${encodeURIComponent(ref)}` : '/referral/shop'}
          className="text-indigo-600 hover:text-indigo-700"
        >
          去选商品
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-4">购物车</h1>
      <ul className="space-y-2 mb-6">
        {cart.map((item, i) => (
          <li key={`${item.id}-${i}`} className="flex justify-between text-slate-700">
            <span>{item.name}</span>
            <span>${item.price}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-bold text-slate-800 mb-4">合计：${total}</p>
      <button
        type="button"
        onClick={goCheckout}
        className="w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold hover:bg-indigo-700"
      >
        去结算
      </button>
      <div className="mt-4">
        <Link href="/referral/shop" className="text-indigo-600 hover:text-indigo-700 text-sm">
          ← 继续选商品
        </Link>
      </div>
    </div>
  );
}

export default function ReferralCartPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">加载中...</div>}>
      <CartContent />
    </Suspense>
  );
}
