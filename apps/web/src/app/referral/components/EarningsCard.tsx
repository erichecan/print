'use client';

import { useReferral } from '@/contexts/ReferralContext';

export function EarningsCard() {
  const { walletBalance, referralCount, referralCap, loading } = useReferral();

  if (loading) {
    return (
      <div className="bg-[#1C1C1C] rounded-2xl p-6 animate-pulse border border-[#2A2A2A]">
        <div className="h-4 bg-[#2A2A2A] rounded w-24 mb-3" />
        <div className="h-10 bg-[#2A2A2A] rounded w-32 mb-1" />
        <div className="h-3 bg-[#2A2A2A] rounded w-40" />
      </div>
    );
  }

  const isComplete = referralCount >= referralCap;

  return (
    <div className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
      <p className="text-[#666] text-sm mb-1">累计已返现</p>
      <p className="text-4xl font-black tracking-tight text-[#F5A623] mb-1">
        CA${walletBalance.toFixed(0)}
      </p>
      <p className="text-[#A0A0A0] text-xs">
        {isComplete
          ? '🎉 恭喜，已完成全部邀请任务！'
          : `已邀请 ${referralCount} / ${referralCap} 位好友`}
      </p>
    </div>
  );
}
