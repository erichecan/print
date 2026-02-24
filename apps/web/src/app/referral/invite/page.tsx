/**
 * Referral 邀请落地页 - 被邀请者视角
 * 展示 "好友送你专属体验"、$1000 商品、Buy Now
 * 2025-02-20 创建
 */
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProductHero } from '../components/ProductHero';
import { PRODUCT_PRICE } from '@/types/referral';

const REF_STORAGE_KEY = 'referral_ref';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  const handleBuyNow = () => {
    if (!ref) {
      router.push('/referral/dashboard');
      return;
    }
    if (user) {
      router.push(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
    } else {
      const redirect = encodeURIComponent(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
      router.push(`/login?redirect=${redirect}`);
    }
  };

  if (!ref) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-slate-600 mb-4">邀请链接无效，缺少推荐人信息</p>
        <Link href="/referral/dashboard" className="text-indigo-600 hover:text-indigo-700">
          前往推广中心
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 mb-6 text-center">
        <p className="text-indigo-800 font-medium">
          你的好友送你一份专属体验
        </p>
      </div>
      <div className="mb-6">
        <ProductHero />
      </div>
      <p className="text-slate-600 mb-6 text-center">
        $1000 高端服务套餐，高级牙齿美白套餐、餐厅 VIP 黑卡等本地服务
      </p>
      <button
        type="button"
        onClick={handleBuyNow}
        className="w-full rounded-lg bg-indigo-600 px-4 py-4 font-semibold text-white hover:bg-indigo-700"
      >
        立即购买 ${PRODUCT_PRICE.toLocaleString()}
      </button>
    </div>
  );
}

export default function ReferralInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <p className="text-slate-500">加载中...</p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
