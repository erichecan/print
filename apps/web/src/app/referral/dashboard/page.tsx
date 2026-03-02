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
      <div className="container mx-auto px-8 py-10">
        <p className="text-[#7A7A7A]">加载中...</p>
      </div>
    );
  }

  const nextReward = getNextReward();
  const isComplete = referralCount >= referralCap;

  return (
    <div className="container mx-auto px-8 py-10 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#0D0D0D]">活动控制台</h1>
        <div className="text-right">
          <p className="text-xs text-[#7A7A7A]">钱包余额</p>
          <p className="text-lg font-semibold text-[#22C55E]">
            ${walletBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ProductHero />
      </div>

      <div className="mb-6 bg-white p-5 border border-[#E8E8E8]">
        <ProgressBar current={referralCount} cap={referralCap} />
        {referralLoading ? (
          <p className="mt-2 text-sm text-[#7A7A7A]">加载中...</p>
        ) : isComplete ? (
          <p className="mt-2 text-sm font-medium text-[#22C55E]">
            任务圆满完成！已达成 {referralCap}/{referralCap} 推荐
          </p>
        ) : nextReward != null ? (
          <p className="mt-2 text-sm font-medium text-[#E42313]">
            邀请第 {referralCount + 1} 位好友购买，即可获得 $
            {nextReward} 佣金！
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/referral/share"
          className="block w-full bg-[#E42313] px-4 py-3 text-center font-medium text-white hover:bg-[#c51f11]"
        >
          邀请好友
        </Link>
        <Link
          href="/referral/wallet"
          className="block w-full border border-[#E8E8E8] px-4 py-3 text-center font-medium text-[#7A7A7A] hover:bg-[#FAFAFA]"
        >
          我的钱包
        </Link>
      </div>

      <SimulatePurchaseButton />
    </div>
  );
}
