/**
 * Referral 极简支付页 - 从购物车来，需登录；有 ref 则支付成功后给推广者加佣金
 * 2025-02-20 创建 | 2026-02-21 支持购物车金额
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { useToast } from '@/hooks/useToast';

const REF_STORAGE_KEY = 'referral_ref';
const CART_STORAGE_KEY = 'referral_cart';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { addReferral } = useReferral();
  const { success, error: showError } = useToast();
  const [paying, setPaying] = useState(false);
  const [total, setTotal] = useState(0);

  const refFromUrl = searchParams?.get('ref');
  const refFromStorage =
    typeof window !== 'undefined' ? sessionStorage.getItem(REF_STORAGE_KEY) : null;
  const refUserId = refFromUrl || refFromStorage;

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CART_STORAGE_KEY) : null;
    const cart = raw ? JSON.parse(raw) : [];
    setTotal(cart.reduce((s: number, i: { price: number }) => s + i.price, 0));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent(
        refUserId ? `/referral/checkout?ref=${encodeURIComponent(refUserId)}` : '/referral/checkout'
      );
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [user, authLoading, router, refUserId]);

  const handlePay = () => {
    if (!user) {
      showError('请先登录');
      return;
    }
    if (total <= 0) {
      showError('请先选择商品');
      return;
    }
    if (refUserId && refUserId === user.id) {
      showError('不能为自己购买（自己是推荐人）');
      return;
    }

    setPaying(true);
    let referralOk = true;
    if (refUserId && refUserId !== user.id) {
      referralOk = addReferral(refUserId);
    }
    setPaying(false);

    if (refUserId && !referralOk) {
      showError('该推荐人已达最大推荐人数');
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REF_STORAGE_KEY);
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
    success('支付成功！' + (refUserId ? '推荐人将获得对应佣金。' : ''));
    router.push('/referral/success');
  };

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (total <= 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-slate-600 mb-4">购物车为空，请先选商品</p>
        <Link href="/referral/shop" className="text-indigo-600 hover:text-indigo-700">
          去选商品
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">确认支付</h1>
      <div className="rounded-xl bg-slate-50 p-6 mb-6">
        <p className="text-2xl font-bold text-slate-800">应付金额：${total.toLocaleString()}</p>
      </div>
      <p className="text-sm text-slate-500 mb-6">此为模拟支付，点击按钮即可完成</p>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="w-full rounded-lg bg-green-600 px-4 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-70"
      >
        {paying ? '处理中...' : `支付 $${total.toLocaleString()}`}
      </button>
      <div className="mt-6">
        <Link href="/referral/shop" className="text-indigo-600 hover:text-indigo-700">
          ← 返回商品页
        </Link>
      </div>
    </div>
  );
}

export default function ReferralCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <p className="text-slate-500">加载中...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
