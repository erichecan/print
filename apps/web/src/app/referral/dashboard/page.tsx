/**
 * Referral 活动控制台 - 推广者主页
 * 展示 $1000 商品、进度条、下一档奖励、分享按钮
 * 2025-02-20 创建
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { ProgressBar } from '../components/ProgressBar';
import { ProductHero } from '../components/ProductHero';
import { SimulatePurchaseButton } from '../components/SimulatePurchaseButton';

export default function ReferralDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    referralCount,
    walletBalance,
    getNextReward,
    referralCap,
    loading: referralLoading,
  } = useReferral();

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent('/referral/dashboard');
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  const nextReward = getNextReward();
  const isComplete = referralCount >= referralCap;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">活动控制台</h1>
        <div className="text-right">
          <p className="text-xs text-slate-500">钱包余额</p>
          <p className="text-lg font-semibold text-green-600">
            ${walletBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ProductHero />
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <ProgressBar current={referralCount} cap={referralCap} />
        {referralLoading ? (
          <p className="mt-2 text-sm text-slate-500">加载中...</p>
        ) : isComplete ? (
          <p className="mt-2 text-sm font-medium text-green-600">
            任务圆满完成！已达成 {referralCap}/{referralCap} 推荐
          </p>
        ) : nextReward != null ? (
          <p className="mt-2 text-sm font-medium text-indigo-600">
            邀请第 {referralCount + 1} 位好友购买，即可获得 $
            {nextReward} 佣金！
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/referral/share"
          className="block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-medium text-white hover:bg-indigo-700"
        >
          邀请好友
        </Link>
        <Link
          href="/referral/wallet"
          className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-medium text-slate-700 hover:bg-slate-50"
        >
          我的钱包
        </Link>
      </div>

      <SimulatePurchaseButton />
    </div>
  );
}
