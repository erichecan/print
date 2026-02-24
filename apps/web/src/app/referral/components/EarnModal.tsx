/**
 * 我要赚钱 - 弹窗：已拿多少、还差几人可拿大奖
 * 2026-02-21 创建
 */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800 mb-4">我的推广进度</h3>
        <div className="space-y-3 mb-6">
          <p className="text-slate-600">
            已拿返现：<span className="font-semibold text-green-600">${walletBalance}</span>
          </p>
          {isComplete ? (
            <p className="text-green-600 font-medium">恭喜！已达成全部档位，任务圆满完成。</p>
          ) : (
            <p className="text-indigo-600 font-medium">
              还差 <strong>{remaining}</strong> 人即可拿下一档大奖
              {nextReward != null && `（$${nextReward}）`}！
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
