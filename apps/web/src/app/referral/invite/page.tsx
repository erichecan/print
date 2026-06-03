'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const REF_STORAGE_KEY = 'referral_ref';

const PERKS = [
  { icon: '🖨️', title: '专业印刷工艺', desc: '本地工厂，品质可靠' },
  { icon: '🎨', title: '自由设计定制', desc: '在线设计工具，所见即所得' },
  { icon: '🚀', title: '快速交付', desc: '加拿大本地发货，3-5 个工作日' },
];

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  const handleBuyNow = () => {
    if (!ref) {
      router.push('/catalog');
      return;
    }
    if (user) {
      router.push(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
    } else {
      const redirect = encodeURIComponent(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
      router.push(`/login?redirect=${redirect}`);
    }
  };

  if (!ref) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">邀请链接无效</h2>
        <p className="text-sm text-[#888] mb-6">链接中缺少推荐人信息，请联系你的好友重新获取链接</p>
        <button
          type="button"
          onClick={() => router.push('/referral')}
          className="px-6 py-3 bg-[#07C160] rounded-xl text-white font-medium"
        >
          了解推广活动
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Hero */}
      <div className="bg-[#07C160] px-6 pt-10 pb-12 text-white text-center">
        <div className="text-4xl mb-3">🎁</div>
        <h1 className="text-xl font-bold mb-1">好友邀请你体验</h1>
        <p className="text-white/80 text-sm">PrintNGo 专属优惠等你来领</p>
      </div>

      <div className="px-4 -mt-6 flex flex-col gap-3 pb-8">
        {/* Main CTA card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="inline-block bg-[#E8F8EE] rounded-xl px-4 py-2 mb-4">
            <span className="text-sm font-semibold text-[#04954A]">专属邀请</span>
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">你的好友送你一份礼物</h2>
          <p className="text-sm text-[#666] mb-5 leading-relaxed">
            通过专属链接下单，双方均可享受返现资格
          </p>
          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full py-4 bg-[#07C160] rounded-xl text-white font-semibold text-base active:opacity-90 transition-opacity"
          >
            立即下单
          </button>
          <p className="text-xs text-[#B0B0B0] mt-3">完成首单后，你也可以邀请自己的好友</p>
        </div>

        {/* Product perks */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a1a1a] mb-4">为什么选择 PrintNGo？</p>
          <div className="flex flex-col gap-4">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#E8F8EE] rounded-full flex items-center justify-center text-lg flex-shrink-0">
                  {perk.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{perk.title}</p>
                  <p className="text-xs text-[#888]">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral info */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a1a1a] mb-3">推广活动说明</p>
          <ul className="text-xs text-[#666] space-y-1.5 leading-relaxed">
            <li>• 通过好友链接首次下单即可参与</li>
            <li>• 好友和你都将获得邀请资格</li>
            <li>• 完成支付后 7-14 个工作日内返现</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReferralInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
          <p className="text-[#888]">加载中...</p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
