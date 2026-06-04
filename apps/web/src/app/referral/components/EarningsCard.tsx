'use client';

import { useReferral } from '@/contexts/ReferralContext';

export function EarningsCard() {
  const { walletBalance, referralCount, referralCap, loading } = useReferral();

  if (loading) {
    return (
      <div className="bg-[#07C160] rounded-2xl p-6 text-white animate-pulse">
        <div className="h-4 bg-white/30 rounded w-24 mb-3" />
        <div className="h-10 bg-white/30 rounded w-32 mb-1" />
        <div className="h-3 bg-white/20 rounded w-40" />
      </div>
    );
  }

  const isComplete = referralCount >= referralCap;

  return (
    <div className="bg-[#07C160] rounded-2xl p-6 text-white">
      <p className="text-white/80 text-sm mb-1">累计已返现</p>
      <p className="text-4xl font-bold mb-1">
        CA${walletBalance.toFixed(0)}
      </p>
      <p className="text-white/70 text-xs">
        {isComplete
          ? '🎉 恭喜，已完成全部邀请任务！'
          : `已邀请 ${referralCount} / ${referralCap} 位好友`}
      </p>
    </div>
  );
}
