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
      localStorage.setItem(REF_STORAGE_KEY, ref);
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
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-lg font-semibold text-white mb-2">邀请链接无效</h2>
        <p className="text-sm text-[#666] mb-6">链接中缺少推荐人信息，请联系你的好友重新获取链接</p>
        <button
          type="button"
          onClick={() => router.push('/referral')}
          className="px-6 py-3 bg-[#E42313] rounded-xl text-white font-medium"
        >
          了解推广活动
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Hero */}
      <div className="relative px-6 pt-12 pb-14 text-center overflow-hidden">
        <div
          className="absolute font-black text-[#E42313] pointer-events-none select-none"
          style={{
            fontSize: 'clamp(100px,30vw,220px)',
            opacity: 0.04,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          GIFT
        </div>
        <div className="relative inline-flex items-center gap-1.5 bg-[rgba(228,35,19,0.12)] border border-[rgba(228,35,19,0.3)] text-[#ff6b5b] text-[11px] font-bold uppercase tracking-[0.5px] px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E42313] animate-pulse" />
          专属邀请
        </div>
        <h1 className="relative text-[clamp(24px,6vw,40px)] font-extrabold leading-tight tracking-tight text-white mb-2">
          好友邀请你体验<br />
          <span className="text-[#E42313]">PrintNGo</span>
        </h1>
        <p className="relative text-[#666] text-[14px] leading-relaxed">专属优惠等你来领</p>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-10">
        {/* Main CTA card */}
        <div className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] text-center">
          <div className="inline-block bg-[rgba(228,35,19,0.12)] border border-[rgba(228,35,19,0.2)] rounded-xl px-4 py-2 mb-4">
            <span className="text-sm font-semibold text-[#E42313]">你的好友送你一份礼物</span>
          </div>
          <p className="text-sm text-[#666] mb-5 leading-relaxed">
            通过专属链接下单，双方均可享受返现资格
          </p>
          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full py-4 bg-[#E42313] rounded-xl text-white font-bold text-base active:opacity-90 transition-opacity"
          >
            立即下单 →
          </button>
          <p className="text-xs text-[#444] mt-3">完成首单后，你也可以邀请自己的好友</p>
        </div>

        {/* Product perks */}
        <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
          <p className="text-sm font-semibold text-white mb-4">为什么选择 PrintNGo？</p>
          <div className="flex flex-col gap-4">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#242424] rounded-full flex items-center justify-center text-lg flex-shrink-0 border border-[#2A2A2A]">
                  {perk.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{perk.title}</p>
                  <p className="text-xs text-[#666]">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral info */}
        <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
          <p className="text-sm font-semibold text-white mb-3">推广活动说明</p>
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
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
          <p className="text-[#666]">加载中...</p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
