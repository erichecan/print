'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { REFERRAL_PRODUCTS } from '../data/products';

const REF_STORAGE_KEY = 'referral_ref';
const CART_STORAGE_KEY = 'referral_cart';

export interface ReferralCartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      localStorage.setItem(REF_STORAGE_KEY, ref);
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
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">选择商品</h1>
        <Link
          href={ref ? `/referral/cart?ref=${encodeURIComponent(ref)}` : '/referral/cart'}
          className="text-[#E42313] hover:text-[#c51f11] text-sm"
        >
          购物车
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {REFERRAL_PRODUCTS.map((p) => (
          <li
            key={p.id}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl overflow-hidden"
          >
            <div className="relative aspect-square w-full bg-[#141414]">
              <Image
                src={p.imageUrl}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="p-4">
              {p.category && (
                <span className="text-xs text-[#666]">{p.category}</span>
              )}
              <p className="font-medium text-white line-clamp-2 mt-0.5">{p.name}</p>
              <p className="text-lg font-bold text-[#F5A623] mt-1">${p.price}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl })}
                  className="flex-1 bg-[#242424] border border-[#2A2A2A] py-2 text-sm font-medium text-[#666] hover:bg-[#2A2A2A] rounded-xl transition-colors"
                >
                  加入购物车
                </button>
                <button
                  type="button"
                  onClick={() => buyNow({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl })}
                  className="flex-1 bg-[#E42313] py-2 text-sm font-medium text-white hover:bg-[#c51f11] rounded-xl transition-colors"
                >
                  直接购买
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link href="/referral" className="text-[#E42313] hover:text-[#c51f11] text-sm">
          ← 返回活动页
        </Link>
      </div>
    </div>
  );
}

export default function ReferralShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" /></div>}>
      <ShopContent />
    </Suspense>
  );
}
