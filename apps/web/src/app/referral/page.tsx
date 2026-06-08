'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const REF_STORAGE_KEY = 'referral_ref';

interface CampaignConfig {
  isActive: boolean;
  cap: number;
  tierAmounts: [number, number, number];
}

const DEFAULT_CAMPAIGN: CampaignConfig = { isActive: true, cap: 3, tierAmounts: [25, 40, 60] };

const TICKER_ITEMS = [
  { icon: '🎉', name: '陈**', action: '获得最终奖励', money: '', time: '2分钟前' },
  { icon: '👋', name: 'PNG7K3M', action: '邀请了新朋友下单', money: '', time: '8分钟前' },
  { icon: '💸', name: '李**', action: '返现到账', money: '', time: '15分钟前' },
  { icon: '🎊', name: '黄**', action: '邀满3位好友', money: '', time: '28分钟前' },
  { icon: '👋', name: 'PNG2R9F', action: '加入推广计划', money: '', time: '41分钟前' },
  { icon: '💸', name: '张**', action: '第1笔返现到账', money: '', time: '1小时前' },
  { icon: '🎊', name: 'PNG9K2M', action: '完成所有邀请', money: '', time: '1.5小时前' },
  { icon: '💸', name: '王**', action: '第2笔返现到账', money: '', time: '2小时前' },
];

const PROOF_WALL = [
  { avatar: '😄', name: '陈**', loc: '多伦多', desc: '邀满3位好友，两周内完成' },
  { avatar: '🙋', name: 'PNG8K2M', loc: '温哥华', desc: '第3位好友刚付款，全额到手' },
  { avatar: '😊', name: '李**', loc: '万锦市', desc: '已邀请2位，还差1位就满额' },
  { avatar: '👩', name: '黄**', loc: '列治文山', desc: '专门发了微信朋友圈，一周搞定' },
  { avatar: '😁', name: 'PNG5L9P', loc: '密西沙加', desc: '第1位好友刚下单，继续加油' },
  { avatar: '🧑', name: '张**', loc: '卡尔加里', desc: '帮朋友都省了钱，自己也赚了' },
];

const HOW_STEPS = [
  { num: '01', icon: '🔗', title: '获取专属邀请链接', desc: '登录后自动生成你的专属推广码，一键复制随时可用' },
  { num: '02', icon: '👫', title: '好友通过链接下单', desc: '好友点击你的链接，在PrintNGo完成首次下单并付款' },
  { num: '03', icon: '💸', title: '返现到账，无需等待', desc: '好友付款后阶梯返现自动结算，邀满即可免费拿印刷服务' },
];

function TickerBar() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden relative border-t border-b border-[#2A2A2A] bg-[#141414] py-3">
      <div
        className="flex w-max gap-0"
        style={{ animation: 'ticker 40s linear infinite' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-8 text-[13px] text-[#A0A0A0] border-r border-[#2A2A2A] whitespace-nowrap"
          >
            <span>{item.icon}</span>
            <span className="text-white font-semibold">{item.name}</span>
            <span>{item.action}</span>
            <span className="text-[#666] text-[11px]">{item.time}</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
    </div>
  );
}

function ReferralLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ref = searchParams?.get('ref');
  const [campaign, setCampaign] = useState<CampaignConfig>(DEFAULT_CAMPAIGN);
  const [referrerCount, setReferrerCount] = useState(2847);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      localStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  useEffect(() => {
    fetch(`${API_BASE}/api/referral/campaign`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setCampaign(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    counterRef.current = setInterval(() => {
      if (Math.random() > 0.65) setReferrerCount((n) => n + 1);
    }, 4000);
    return () => { if (counterRef.current) clearInterval(counterRef.current); };
  }, []);

  const tierItems = campaign.tierAmounts.slice(0, campaign.cap);
  const maxTotal = tierItems.reduce((a, b) => a + b, 0);

  const handleAction = () => {
    if (ref) {
      if (user) {
        router.push(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
      } else {
        const redirect = encodeURIComponent(`/referral/checkout?ref=${encodeURIComponent(ref)}`);
        router.push(`/login?redirect=${redirect}`);
      }
    } else {
      if (user) {
        router.push('/referral/me');
      } else {
        router.push(`/login?redirect=${encodeURIComponent('/referral/me')}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 overflow-hidden">
        <div
          className="absolute font-black text-[#E42313] pointer-events-none select-none"
          style={{
            fontSize: 'clamp(120px,35vw,280px)',
            opacity: 0.05,
            letterSpacing: '-4px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          ${maxTotal}
        </div>

        <div className="relative inline-flex items-center gap-1.5 bg-[rgba(228,35,19,0.12)] border border-[rgba(228,35,19,0.3)] text-[#ff6b5b] text-[11px] font-bold uppercase tracking-[0.5px] px-4 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E42313] animate-pulse" />
          限时活动进行中
        </div>

        <h1 className="relative text-[clamp(28px,7vw,56px)] font-extrabold leading-[1.1] tracking-tight mb-3">
          邀请好友<br />
          最高返现 <span className="text-[#E42313]">CA${maxTotal}</span>
        </h1>
        <p className="relative text-[#666] text-[15px] leading-[1.7] max-w-xs mb-8">
          邀请 {campaign.cap} 位朋友在 PrintNGo 完成首单<br />
          <span className="text-[#A0A0A0]">阶梯奖励，每位好友付款后立即到账</span>
        </p>

        <button
          type="button"
          onClick={handleAction}
          className="relative bg-[#E42313] text-white font-bold text-[16px] px-9 py-4 rounded-lg transition-all active:opacity-90"
        >
          {ref ? '立即下单，享专属优惠 →' : (user ? '进入我的推广中心 →' : '获取我的邀请链接 →')}
        </button>

        {/* Stats */}
        <div className="relative flex gap-8 mt-10 pt-8 border-t border-[#2A2A2A] flex-wrap justify-center">
          {[
            { num: referrerCount.toLocaleString(), label: '已参与推广' },
            { num: '98%', label: '好友满意度' },
            { num: `CA$${maxTotal}`, label: '最高可返现' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[22px] font-extrabold tracking-tight text-[#E42313]">{s.num}</p>
              <p className="text-[11px] text-[#666] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <TickerBar />

      {/* Tiers */}
      <div className="px-4 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#E42313] mb-2">阶梯返现</p>
        <p className="text-[clamp(22px,5vw,36px)] font-extrabold tracking-tight mb-6">邀得越多，赚得越多</p>
        <div className="flex flex-col gap-3">
          {tierItems.map((amount, i) => {
            const isFeatured = i === tierItems.length - 1;
            return (
              <div
                key={i}
                className="rounded-2xl border p-5 flex items-center justify-between"
                style={{
                  background: isFeatured ? 'linear-gradient(135deg,#1C1C1C 0%,#200f0f 100%)' : '#1C1C1C',
                  borderColor: isFeatured ? '#E42313' : '#2A2A2A',
                }}
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#666] mb-1">第 {i + 1} 位好友</p>
                  <p
                    className="text-[36px] font-black tracking-tight leading-none"
                    style={{ color: isFeatured ? '#E42313' : '#fff' }}
                  >
                    CA${amount}
                  </p>
                  <p className="text-[12px] text-[#666] mt-1">返现 · 付款后到账</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isFeatured && (
                    <span className="bg-[#E42313] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      BEST
                    </span>
                  )}
                  <span className="text-[12px] text-[#666]">✓ 立即到账</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-[13px] text-[#666] mt-4">
          合计最多返现 <strong className="text-[#F5A623] text-[16px]">CA${maxTotal}</strong> · 每位好友须为首次下单新客户
        </p>
      </div>

      {/* How it works */}
      <div className="px-4 py-6 bg-[#141414] border-t border-[#2A2A2A]">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#E42313] mb-2">参与方式</p>
        <p className="text-[clamp(20px,5vw,32px)] font-extrabold tracking-tight mb-6">三步，就这么简单</p>
        <div className="flex flex-col gap-6">
          {HOW_STEPS.map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full border border-[#2A2A2A] flex items-center justify-center text-[13px] font-bold text-[#E42313] flex-shrink-0">
                {step.num}
              </div>
              <div>
                <p className="font-semibold text-[15px] mb-1">{step.title}</p>
                <p className="text-[13px] text-[#666] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof wall */}
      <div className="px-4 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#E42313] mb-2">真实案例</p>
        <p className="text-[clamp(20px,5vw,32px)] font-extrabold tracking-tight mb-6">他们已经拿到了</p>
        <div className="grid grid-cols-2 gap-3">
          {PROOF_WALL.map((p, i) => (
            <div key={i} className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#242424] flex items-center justify-center text-[16px] flex-shrink-0">
                  {p.avatar}
                </div>
                <div>
                  <p className="text-[12px] font-semibold">{p.name}</p>
                  <p className="text-[10px] text-[#666]">{p.loc}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#A0A0A0] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="px-4 py-12 text-center bg-[#141414] border-t border-[#2A2A2A]">
        <p className="text-[clamp(56px,14vw,96px)] font-black text-[#E42313] tracking-tight leading-none mb-2">
          CA${maxTotal}
        </p>
        <h2 className="text-[clamp(18px,5vw,28px)] font-bold mb-2">等你来拿</h2>
        <p className="text-[#666] text-[14px] mb-8">邀请 {campaign.cap} 位朋友，全部奖励到手</p>
        <button
          type="button"
          onClick={handleAction}
          className="bg-[#E42313] text-white font-bold text-[17px] px-10 py-4 rounded-lg transition-all active:opacity-90 w-full max-w-xs"
        >
          立即开始 →
        </button>
        <p className="text-[12px] text-[#666] mt-4">活动规则：每账号最多邀请 {campaign.cap} 位新客户</p>
      </div>

      {user && (
        <div className="py-4 text-center border-t border-[#2A2A2A]">
          <Link href="/referral/me" className="text-sm text-[#E42313]">
            查看我的推广进度 →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
          <p className="text-[#666]">加载中...</p>
        </div>
      }
    >
      <ReferralLandingContent />
    </Suspense>
  );
}
