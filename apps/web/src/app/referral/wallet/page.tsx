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
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">我的钱包</h1>

      <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-700 p-6 text-white mb-6 shadow">
        <p className="text-green-100 text-sm mb-1">可用余额</p>
        <p className="text-3xl font-bold">
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
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-400 cursor-not-allowed"
        >
          提现（即将开放）
        </button>
        <button
          type="button"
          disabled
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-400 cursor-not-allowed"
        >
          兑换（即将开放）
        </button>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-3">佣金明细</h2>
      {referralLoading ? (
        <p className="text-slate-500">加载中...</p>
      ) : transactionHistory.length === 0 ? (
        <p className="text-slate-500 py-8 text-center">暂无佣金记录</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {transactionHistory.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-800">{tx.description}</p>
                <p className="text-xs text-slate-500">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="font-semibold text-green-600">
                +${tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link
          href="/referral/dashboard"
          className="text-indigo-600 hover:text-indigo-700"
        >
          ← 返回控制台
        </Link>
      </div>
    </div>
  );
}
