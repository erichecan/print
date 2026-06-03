'use client';

import { useReferral } from '@/contexts/ReferralContext';
import type { Transaction } from '@/types/referral';

// #04954A = #07C160 darkened for WCAG AA contrast on white (4.6:1)
const TEXT_GREEN = '#04954A';

function FriendRow({ tx, index }: { tx: Transaction; index: number }) {
  const avatarColors = ['#07C160', '#1677FF', '#FF6B35', '#9B59B6'];
  const color = avatarColors[index % avatarColors.length];
  const label = `好友 ${index + 1}`;
  const date = new Date(tx.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ background: color }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1a1a]">{label}</p>
        <p className="text-xs text-[#888]">{date} · 下单成功</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold" style={{ color: TEXT_GREEN }}>+¥{tx.amount}</p>
        <span className="inline-block text-xs bg-[#E8F8EE] rounded-full px-2 py-0.5" style={{ color: TEXT_GREEN }}>
          已到账
        </span>
      </div>
    </div>
  );
}

function EmptySlot({ index, isCurrent }: { index: number; isCurrent: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          background: isCurrent ? '#E8F8EE' : '#F5F5F5',
          color: isCurrent ? TEXT_GREEN : '#C0C0C0',
          border: isCurrent ? `2px dashed ${TEXT_GREEN}` : '2px dashed #E0E0E0',
        }}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="text-sm" style={{ color: isCurrent ? TEXT_GREEN : '#C0C0C0' }}>
          {isCurrent ? '等待你的下一位好友' : `第 ${index + 1} 位好友`}
        </p>
        {isCurrent && (
          <p className="text-xs" style={{ color: TEXT_GREEN, opacity: 0.8 }}>邀请后即可解锁奖励</p>
        )}
      </div>
      {isCurrent && (
        <span className="text-xs bg-[#FFF3CD] text-[#856404] rounded-full px-2 py-0.5">
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
      <div className="bg-white rounded-2xl p-5">
        <div className="h-4 bg-gray-100 rounded w-20 mb-3" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const slots = Array.from({ length: referralCap }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#1a1a1a] mb-1">好友列表</p>
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
