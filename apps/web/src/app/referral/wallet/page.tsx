/**
 * Referral 我的钱包 - 佣金明细与提现
 * 展示钱包余额、交易列表、提现/兑换占位按钮
 * 2025-02-20 创建
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';

export default function ReferralWalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    walletBalance,
    transactionHistory,
    loading: referralLoading,
  } = useReferral();

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent('/referral/wallet');
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

  return (
    <div className="container mx-auto px-8 py-10 max-w-2xl">
      <h1 className="text-lg font-bold text-[#0D0D0D] mb-6">我的钱包</h1>

      <div className="bg-[#FAFAFA] p-7 mb-6 border border-[#E8E8E8]">
        <p className="text-xs text-[#7A7A7A] mb-1">可用余额</p>
        <p className="text-4xl font-bold text-[#22C55E]">
          $
          {referralLoading
            ? '...'
            : walletBalance.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          disabled
          className="flex-1 bg-[#FAFAFA] border border-[#E8E8E8] px-4 py-3 font-medium text-[#B0B0B0] cursor-not-allowed"
        >
          提现（即将开放）
        </button>
        <button
          type="button"
          disabled
          className="flex-1 bg-[#FAFAFA] border border-[#E8E8E8] px-4 py-3 font-medium text-[#B0B0B0] cursor-not-allowed"
        >
          兑换（即将开放）
        </button>
      </div>

      <h2 className="text-base font-semibold text-[#0D0D0D] mb-3">佣金明细</h2>
      {referralLoading ? (
        <p className="text-[#7A7A7A]">加载中...</p>
      ) : transactionHistory.length === 0 ? (
        <p className="text-[#7A7A7A] py-8 text-center">暂无佣金记录</p>
      ) : (
        <ul className="divide-y divide-[#E8E8E8] border border-[#E8E8E8] bg-white">
          {transactionHistory.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA]"
            >
              <div>
                <p className="font-medium text-[#0D0D0D]">{tx.description}</p>
                <p className="text-xs text-[#7A7A7A]">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="font-semibold text-[#22C55E]">
                +${tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link
          href="/referral/dashboard"
          className="text-[#E42313] hover:text-[#c51f11]"
        >
          ← 返回控制台
        </Link>
      </div>
    </div>
  );
}
