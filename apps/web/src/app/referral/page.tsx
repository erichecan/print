'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const REF_STORAGE_KEY = 'referral_ref';

const HOW_STEPS = [
  { icon: '🔗', title: '分享邀请链接', desc: '把你的专属链接发给好友' },
  { icon: '🛍️', title: '好友完成下单', desc: '好友通过链接下单并完成支付' },
  { icon: '💸', title: '你立刻获得返现', desc: '每邀一位好友，阶梯返现到账' },
];

const TIER_ITEMS = [
  { tier: '第 1 位', amount: '¥200', label: '到账' },
  { tier: '第 2 位', amount: '¥400', label: '到账' },
  { tier: '第 3 位', amount: '¥800', label: '到账' },
];

function ReferralLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  const handleAction = () => {
    if (ref) {
      // Invited user flow
      if (user) {
        router.push(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
      } else {
        const redirect = encodeURIComponent(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
        router.push(`/login?redirect=${redirect}`);
      }
    } else {
      // Existing user going to their dashboard
      if (user) {
        router.push('/referral/me');
      } else {
        router.push(`/login?redirect=${encodeURIComponent('/referral/me')}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Hero */}
      <div className="bg-[#07C160] px-6 pt-12 pb-10 text-white text-center">
        <div className="text-5xl mb-4">🎁</div>
        <h1 className="text-2xl font-bold mb-2">邀请好友，一起赚返现</h1>
        <p className="text-white/80 text-sm leading-relaxed">
          每成功邀请一位好友下单<br />
          最多返现 <span className="font-bold text-white">¥1400</span>，相当于免费拿到一套印刷服务
        </p>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-3 pb-8">
        {/* CTA card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {ref ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">👋</span>
                <p className="text-sm font-semibold text-[#1a1a1a]">你的好友邀请你加入</p>
              </div>
              <p className="text-xs text-[#666] mb-4 leading-relaxed">
                通过好友的专属链接下单，享受同等返现资格。完成首单后，你也可以邀请自己的好友！
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#1a1a1a] mb-1">开始邀请</p>
              <p className="text-xs text-[#666] mb-4">进入推广中心，获取你的专属邀请码</p>
            </>
          )}
          <button
            type="button"
            onClick={handleAction}
            className="w-full py-4 bg-[#07C160] rounded-2xl text-white font-semibold text-base active:opacity-90 transition-opacity"
          >
            {ref ? '立即下单 享受优惠' : (user ? '进入我的推广中心' : '登录后开始邀请')}
          </button>
        </div>

        {/* Tier table */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a1a1a] mb-4">阶梯返现规则</p>
          <div className="flex gap-2">
            {TIER_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 bg-[#F5F5F5] rounded-xl py-4"
              >
                <p className="text-xs text-[#888]">{item.tier}</p>
                <p className="text-xl font-bold text-[#04954A]">{item.amount}</p>
                <span className="text-xs bg-[#E8F8EE] text-[#04954A] rounded-full px-2 py-0.5">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-[#888] mt-3">
            合计最多返现 <strong className="text-[#04954A]">¥1400</strong> · 每位好友须完成付款
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a1a1a] mb-4">怎么参与？</p>
          <div className="flex flex-col gap-4">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#E8F8EE] rounded-full flex items-center justify-center text-lg flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{step.title}</p>
                  <p className="text-xs text-[#888] mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ / fine print */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a1a1a] mb-3">活动说明</p>
          <ul className="text-xs text-[#666] space-y-2 leading-relaxed">
            <li>• 每个账号最多可邀请 3 位好友</li>
            <li>• 好友须为首次在 PrintNGo 下单的新客户</li>
            <li>• 返现金额在好友完成支付后 7-14 个工作日内到账</li>
            <li>• PrintNGo 保留对活动规则的最终解释权</li>
          </ul>
        </div>

        {user && (
          <Link
            href="/referral/me"
            className="text-center text-sm text-[#04954A] py-2"
          >
            查看我的推广进度 →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
          <p className="text-[#888]">加载中...</p>
        </div>
      }
    >
      <ReferralLandingContent />
    </Suspense>
  );
}
