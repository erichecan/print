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
  const { refresh } = useReferral();
  const { success, error: showError } = useToast();
  const [paying, setPaying] = useState(false);
  const [total, setTotal] = useState(0);

  const refFromUrl = searchParams?.get('ref');
  const refFromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(REF_STORAGE_KEY) : null;
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REF_STORAGE_KEY);
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
    refresh();
    setPaying(false);
    success('支付成功！' + (refUserId ? '推荐人将获得对应佣金。' : ''));
    router.push('/referral/success');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (total <= 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto text-center">
        <p className="text-[#666] mb-4">购物车为空，请先选商品</p>
        <Link href="/referral/shop" className="text-[#E42313] hover:text-[#c51f11]">
          去选商品
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-6">确认支付</h1>
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
        <p className="text-sm text-[#666] mb-2">应付金额</p>
        <p className="text-3xl font-bold text-[#F5A623]">${total.toLocaleString()}</p>
      </div>
      <p className="text-xs text-[#666] mb-6">此为模拟支付，点击按钮即可完成</p>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="w-full bg-[#E42313] px-4 py-4 font-medium text-white hover:bg-[#c51f11] disabled:opacity-70 rounded-xl transition-colors"
      >
        {paying ? '处理中...' : `支付 $${total.toLocaleString()}`}
      </button>
      <div className="mt-6">
        <Link href="/referral/shop" className="text-[#E42313] hover:text-[#c51f11]">
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
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
