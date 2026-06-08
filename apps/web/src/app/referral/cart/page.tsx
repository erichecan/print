'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReferralCartItem } from '../shop/page';

const CART_STORAGE_KEY = 'referral_cart';
const REF_STORAGE_KEY = 'referral_ref';

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref');
  const [cart, setCart] = useState<ReferralCartItem[]>([]);

  useEffect(() => {
    if (ref && typeof window !== 'undefined') localStorage.setItem(REF_STORAGE_KEY, ref);
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
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto text-center">
        <p className="text-[#666] mb-4">购物车是空的</p>
        <Link
          href={ref ? `/referral/shop?ref=${encodeURIComponent(ref)}` : '/referral/shop'}
          className="text-[#E42313] hover:text-[#c51f11]"
        >
          去选商品
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-6">购物车</h1>
      <ul className="space-y-3 mb-6">
        {cart.map((item, i) => (
          <li key={`${item.id}-${i}`} className="flex gap-4 items-center bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-4">
            {item.imageUrl && (
              <div className="relative w-16 h-16 shrink-0 overflow-hidden bg-[#141414] rounded-xl">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
              </div>
            )}
            <span className="flex-1 text-white line-clamp-2">{item.name}</span>
            <span className="font-semibold text-[#F5A623]">${item.price}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mb-6 px-1">
        <span className="text-[#666]">合计</span>
        <span className="text-xl font-bold text-[#F5A623]">${total}</span>
      </div>
      <button
        type="button"
        onClick={goCheckout}
        className="w-full bg-[#E42313] py-3 text-white font-medium hover:bg-[#c51f11] rounded-xl transition-colors"
      >
        去结算
      </button>
      <div className="mt-4">
        <Link href="/referral/shop" className="text-[#E42313] hover:text-[#c51f11] text-sm">
          ← 继续选商品
        </Link>
      </div>
    </div>
  );
}

export default function ReferralCartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" /></div>}>
      <CartContent />
    </Suspense>
  );
}
