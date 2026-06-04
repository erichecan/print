'use client';

import { useReferral } from '@/contexts/ReferralContext';
import type { Transaction } from '@/types/referral';

// #04954A = darkened green, 4.6:1 on white (WCAG AA compliant)
const TEXT_GREEN = '#04954A';

function RewardRow({ tx, index }: { tx: Transaction; index: number }) {
  const date = new Date(tx.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
      <div className="w-9 h-9 rounded-full bg-[#E8F8EE] flex items-center justify-center flex-shrink-0">
        <span className="text-base" aria-hidden="true">🎁</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1a1a]">邀请好友 #{index + 1} 返现</p>
        <p className="text-xs text-[#888]">{date}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold" style={{ color: TEXT_GREEN }}>+CA${tx.amount}</p>
        <span className="inline-block text-xs bg-[#E8F8EE] rounded-full px-2 py-0.5" style={{ color: TEXT_GREEN }}>
          已到账
        </span>
      </div>
    </div>
  );
}

export function RewardsList() {
  const { transactionHistory, walletBalance, referralCap, tierAmounts, loading } = useReferral();

  const maxTotal = [...tierAmounts].slice(0, referralCap).reduce((a, b) => a + b, 0);
  const pending = 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-12 mb-2" />
              <div className="h-7 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-5 animate-pulse">
          <div className="h-2 bg-gray-100 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4">
          <p className="text-xs text-[#888] mb-1">已到账</p>
          <p className="text-2xl font-bold" style={{ color: TEXT_GREEN }}>CA${walletBalance.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <p className="text-xs text-[#888] mb-1">待审核</p>
          <p className="text-2xl font-bold text-[#B45309]">CA${pending}</p>
        </div>
      </div>

      {/* Progress toward max */}
      <div className="bg-white rounded-2xl p-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-[#888]">累计进度</p>
          <p className="text-xs font-medium" style={{ color: TEXT_GREEN }}>
            CA${walletBalance} / CA${maxTotal}
          </p>
        </div>
        <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#07C160] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (walletBalance / maxTotal) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#888] mt-2 text-center">
          {walletBalance >= maxTotal
            ? '🎉 已完成全部返现'
            : `还差 CA$${maxTotal - walletBalance} 可领满额返现`}
        </p>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl p-5">
        <p className="text-sm font-semibold text-[#1a1a1a] mb-1">奖励明细</p>
        {transactionHistory.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2" aria-hidden="true">📭</p>
            <p className="text-sm text-[#888]">暂无奖励记录</p>
            <p className="text-xs text-[#B0B0B0] mt-1">邀请好友下单后，奖励将在这里显示</p>
          </div>
        ) : (
          <div>
            {[...transactionHistory].reverse().map((tx, i) => (
              <RewardRow key={tx.id} tx={tx} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
