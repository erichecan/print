'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { ProgressBar } from '../components/ProgressBar';
import { ProductHero } from '../components/ProductHero';
import { SimulatePurchaseButton } from '../components/SimulatePurchaseButton';
import { InviteShareModal } from '../components/InviteShareModal';

export default function ReferralDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
      </div>
    );
  }

  const nextReward = getNextReward();
  const isComplete = referralCount >= referralCap;

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">活动控制台</h1>
        <div className="text-right">
          <p className="text-xs text-[#666]">钱包余额</p>
          <p className="text-lg font-semibold text-[#F5A623]">
            CA${walletBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ProductHero />
      </div>

      <div className="mb-6 bg-[#1C1C1C] p-5 border border-[#2A2A2A] rounded-2xl">
        <ProgressBar current={referralCount} cap={referralCap} />
        {referralLoading ? (
          <p className="mt-2 text-sm text-[#666]">加载中...</p>
        ) : isComplete ? (
          <p className="mt-2 text-sm font-medium text-[#F5A623]">
            任务圆满完成！已达成 {referralCap}/{referralCap} 推荐
          </p>
        ) : nextReward != null ? (
          <p className="mt-2 text-sm font-medium text-[#E42313]">
            邀请第 {referralCount + 1} 位好友购买，即可获得 CA${nextReward} 佣金！
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="block w-full bg-[#E42313] px-4 py-3 text-center font-medium text-white hover:bg-[#c51f11] rounded-xl transition-colors"
        >
          邀请好友
        </button>
        <Link
          href="/referral/wallet"
          className="block w-full border border-[#2A2A2A] px-4 py-3 text-center font-medium text-[#666] hover:bg-[#1C1C1C] rounded-xl transition-colors"
        >
          我的钱包
        </Link>
      </div>

      <InviteShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <SimulatePurchaseButton />
    </div>
  );
}
