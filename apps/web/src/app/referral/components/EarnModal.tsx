'use client';

import { useReferral } from '@/contexts/ReferralContext';

interface EarnModalProps {
  open: boolean;
  onClose: () => void;
}

export function EarnModal({ open, onClose }: EarnModalProps) {
  const { referralCount, walletBalance, getNextReward, referralCap } = useReferral();
  const nextReward = getNextReward();
  const remaining = referralCap - referralCount;
  const isComplete = referralCount >= referralCap;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1C1C1C] border border-[#2A2A2A] max-w-sm w-full p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">我的推广进度</h3>
        <div className="space-y-3 mb-6">
          <p className="text-[#666]">
            已拿返现：<span className="font-semibold text-[#F5A623]">CA${walletBalance}</span>
          </p>
          {isComplete ? (
            <p className="text-[#F5A623] font-medium">恭喜！已达成全部档位，任务圆满完成。</p>
          ) : (
            <p className="text-[#E42313] font-medium">
              还差 <strong>{remaining}</strong> 人即可拿下一档大奖
              {nextReward != null && `（CA$${nextReward}）`}！
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-[#E42313] py-2.5 text-white font-medium rounded-xl hover:bg-[#c51f11] transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
