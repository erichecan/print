'use client';

import { useReferral } from '@/contexts/ReferralContext';
import type { Transaction } from '@/types/referral';

function FriendRow({ tx, index }: { tx: Transaction; index: number }) {
  const date = new Date(tx.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2A2A2A] last:border-0">
      <div className="w-9 h-9 rounded-full bg-[#E42313] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">好友 {index + 1}</p>
        <p className="text-xs text-[#666]">{date} · 下单成功</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#F5A623]">+CA${tx.amount}</p>
        <span className="inline-block text-xs bg-[rgba(245,166,35,0.12)] text-[#F5A623] rounded-full px-2 py-0.5">
          已到账
        </span>
      </div>
    </div>
  );
}

function EmptySlot({ index, isCurrent }: { index: number; isCurrent: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2A2A2A] last:border-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          background: isCurrent ? 'rgba(228,35,19,0.12)' : '#242424',
          color: isCurrent ? '#E42313' : '#444',
          border: isCurrent ? '2px dashed #E42313' : '2px dashed #2A2A2A',
        }}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="text-sm" style={{ color: isCurrent ? '#E42313' : '#444' }}>
          {isCurrent ? '等待你的下一位好友' : `第 ${index + 1} 位好友`}
        </p>
        {isCurrent && (
          <p className="text-xs text-[#E42313] opacity-70">邀请后即可解锁奖励</p>
        )}
      </div>
      {isCurrent && (
        <span className="text-xs bg-[rgba(228,35,19,0.12)] text-[#E42313] rounded-full px-2 py-0.5">
          待邀请
        </span>
      )}
    </div>
  );
}

export function FriendStatusList() {
  const { transactionHistory, referralCount, referralCap, loading } = useReferral();

  if (loading) {
    return (
      <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
        <div className="h-4 bg-[#2A2A2A] rounded w-20 mb-3" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#2A2A2A] last:border-0">
            <div className="w-9 h-9 rounded-full bg-[#2A2A2A] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-[#2A2A2A] rounded w-16 animate-pulse" />
              <div className="h-3 bg-[#2A2A2A] rounded w-24 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const slots = Array.from({ length: referralCap }, (_, i) => i);

  return (
    <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
      <p className="text-sm font-semibold text-white mb-1">好友列表</p>
      <div>
        {slots.map((i) => {
          if (i < referralCount && transactionHistory[referralCount - 1 - i]) {
            return (
              <FriendRow
                key={i}
                tx={transactionHistory[referralCount - 1 - i]}
                index={i}
              />
            );
          }
          return (
            <EmptySlot key={i} index={i} isCurrent={i === referralCount} />
          );
        })}
      </div>
    </div>
  );
}
