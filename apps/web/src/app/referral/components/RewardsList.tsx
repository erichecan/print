'use client';

import { useReferral } from '@/contexts/ReferralContext';
import type { Transaction } from '@/types/referral';

function StatusBadge({ status }: { status?: string }) {
  if (status === 'FROZEN') {
    return (
      <span className="inline-block text-xs bg-[rgba(255,165,0,0.12)] text-orange-400 rounded-full px-2 py-0.5">
        审核中
      </span>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <span className="inline-block text-xs bg-[rgba(255,80,80,0.12)] text-red-400 rounded-full px-2 py-0.5">
        已取消
      </span>
    );
  }
  if (status === 'PAID') {
    return (
      <span className="inline-block text-xs bg-[rgba(80,200,120,0.12)] text-green-400 rounded-full px-2 py-0.5">
        已发放
      </span>
    );
  }
  return (
    <span className="inline-block text-xs bg-[rgba(245,166,35,0.12)] text-[#F5A623] rounded-full px-2 py-0.5">
      待到账
    </span>
  );
}

function RewardRow({ tx, index }: { tx: Transaction; index: number }) {
  const date = new Date(tx.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const isFrozen = tx.status === 'FROZEN';

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-[#2A2A2A] last:border-0 ${isFrozen ? 'opacity-60' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isFrozen ? 'bg-[rgba(255,165,0,0.08)]' : 'bg-[rgba(245,166,35,0.12)]'}`}>
        <span className="text-base" aria-hidden="true">{isFrozen ? '🔒' : '🎁'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">邀请好友 #{index + 1} 返现</p>
        <p className="text-xs text-[#666]">{date}</p>
        {isFrozen && (
          <p className="text-xs text-orange-400 mt-0.5">风控审核中，30天内完成审核</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isFrozen ? 'text-orange-400' : 'text-[#F5A623]'}`}>+CA${tx.amount}</p>
        <StatusBadge status={tx.status} />
      </div>
    </div>
  );
}

export function RewardsList() {
  const { transactionHistory, walletBalance, referralCap, tierAmounts, loading } = useReferral();

  const maxTotal = [...tierAmounts].slice(0, referralCap).reduce((a, b) => a + b, 0);
  const frozenBalance = transactionHistory
    .filter(t => t.status === 'FROZEN')
    .reduce((s, t) => s + t.amount, 0);
  const pendingBalance = transactionHistory
    .filter(t => !t.status || t.status === 'PENDING')
    .reduce((s, t) => s + t.amount, 0);
  const pending = frozenBalance + pendingBalance;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-[#1C1C1C] rounded-2xl p-4 animate-pulse border border-[#2A2A2A]">
              <div className="h-3 bg-[#2A2A2A] rounded w-12 mb-2" />
              <div className="h-7 bg-[#2A2A2A] rounded w-20" />
            </div>
          ))}
        </div>
        <div className="bg-[#1C1C1C] rounded-2xl p-5 animate-pulse border border-[#2A2A2A]">
          <div className="h-2 bg-[#2A2A2A] rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1C1C1C] rounded-2xl p-4 border border-[#2A2A2A]">
          <p className="text-xs text-[#666] mb-1">已到账</p>
          <p className="text-2xl font-black text-[#F5A623]">CA${walletBalance.toFixed(0)}</p>
        </div>
        <div className="bg-[#1C1C1C] rounded-2xl p-4 border border-[#2A2A2A]">
          <p className="text-xs text-[#666] mb-1">{frozenBalance > 0 ? '审核中' : '待到账'}</p>
          <p className={`text-2xl font-black ${frozenBalance > 0 ? 'text-orange-400' : 'text-[#A0A0A0]'}`}>CA${pending.toFixed(0)}</p>
        </div>
      </div>

      {/* Progress toward max */}
      <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-[#666]">累计进度</p>
          <p className="text-xs font-medium text-[#F5A623]">
            CA${walletBalance} / CA${maxTotal}
          </p>
        </div>
        <div className="h-2 bg-[#242424] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E42313] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (walletBalance / maxTotal) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#666] mt-2 text-center">
          {walletBalance >= maxTotal
            ? '🎉 已完成全部返现'
            : `还差 CA$${maxTotal - walletBalance} 可领满额返现`}
        </p>
      </div>

      {/* Transaction list */}
      <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
        <p className="text-sm font-semibold text-white mb-1">奖励明细</p>
        {transactionHistory.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2" aria-hidden="true">📭</p>
            <p className="text-sm text-[#666]">暂无奖励记录</p>
            <p className="text-xs text-[#444] mt-1">邀请好友下单后，奖励将在这里显示</p>
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
