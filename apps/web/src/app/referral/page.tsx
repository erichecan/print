/**
 * Referral 第一页 - 老客与新客统一入口
 * 上：发 INS / Facebook / 小红书海报切换
 * 下：我要赚钱（弹窗进度）、我要加入（进入购物）
 * 新用户带 ref 链接进入同页，我要加入=同一购买流程
 * 2026-02-21 重构
 */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SocialPosterTabs } from './components/SocialPosterTabs';
import { EarnModal } from './components/EarnModal';

const REF_STORAGE_KEY = 'referral_ref';

function ReferralHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [earnModalOpen, setEarnModalOpen] = useState(false);

  const ref = searchParams?.get('ref');

  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
    }
  }, [ref]);

  const handleJoin = () => {
    const base = '/referral/shop';
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    router.push(base + qs);
  };

  return (
    <div className="container mx-auto px-8 py-10 max-w-2xl">
      <h1 className="text-lg font-bold text-[#0D0D0D] mb-8 text-center">邀请好友 · 一起赚</h1>

      <div className="mb-8">
        <SocialPosterTabs />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setEarnModalOpen(true)}
          className="w-full bg-[#E42313] px-4 py-4 text-white font-medium hover:bg-[#c51f11]"
        >
          我要赚钱
        </button>
        <button
          type="button"
          onClick={handleJoin}
          className="w-full bg-[#E42313] px-4 py-4 text-white font-medium hover:bg-[#c51f11]"
        >
          我要加入
        </button>
      </div>

      <EarnModal open={earnModalOpen} onClose={() => setEarnModalOpen(false)} />
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-[#7A7A7A]">加载中...</p>
        </div>
      }
    >
      <ReferralHomeContent />
    </Suspense>
  );
}
