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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-6">我的钱包</h1>

      <div className="bg-[#1C1C1C] p-7 mb-6 border border-[#2A2A2A] rounded-2xl">
        <p className="text-xs text-[#666] mb-1">可用余额</p>
        <p className="text-4xl font-black text-[#F5A623]">
          CA${referralLoading ? '...' : walletBalance.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          disabled
          className="flex-1 bg-[#1C1C1C] border border-[#2A2A2A] px-4 py-3 font-medium text-[#444] cursor-not-allowed rounded-xl"
        >
          提现（即将开放）
        </button>
        <button
          type="button"
          disabled
          className="flex-1 bg-[#1C1C1C] border border-[#2A2A2A] px-4 py-3 font-medium text-[#444] cursor-not-allowed rounded-xl"
        >
          兑换（即将开放）
        </button>
      </div>

      <h2 className="text-base font-semibold text-white mb-3">佣金明细</h2>
      {referralLoading ? (
        <p className="text-[#666]">加载中...</p>
      ) : transactionHistory.length === 0 ? (
        <p className="text-[#666] py-8 text-center">暂无佣金记录</p>
      ) : (
        <ul className="divide-y divide-[#2A2A2A] border border-[#2A2A2A] bg-[#1C1C1C] rounded-2xl overflow-hidden">
          {transactionHistory.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{tx.description}</p>
                <p className="text-xs text-[#666]">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="font-semibold text-[#F5A623]">
                +CA${tx.amount}
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
