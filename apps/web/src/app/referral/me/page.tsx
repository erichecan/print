'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { EarningsCard } from '../components/EarningsCard';
import { MilestoneBar } from '../components/MilestoneBar';
import { FriendStatusList } from '../components/FriendStatusList';
import { InviteCodeCard } from '../components/InviteCodeCard';
import { ShareTextCard } from '../components/ShareTextCard';
import { RewardsList } from '../components/RewardsList';
import { BottomTabBar, type ReferralTab } from '../components/BottomTabBar';
import { generateInviteCode } from '../lib/inviteCode';

function ProgressTab() {
  const { user } = useAuth();
  const router = useRouter();
  const inviteCode = user ? generateInviteCode(user.id) : '';
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/invite?ref=${inviteCode}`
      : '';

  const handleShare = async () => {
    if (navigator.share && inviteLink) {
      try {
        await navigator.share({
          title: 'PrintNGo 专属邀请',
          text: `用我的邀请码 ${inviteCode} 下单，立享专属优惠！`,
          url: inviteLink,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <EarningsCard />
      <MilestoneBar />
      <FriendStatusList />

      {/* CTA */}
      <button
        type="button"
        onClick={handleShare}
        className="w-full py-4 bg-[#07C160] rounded-2xl text-white font-semibold text-base active:opacity-90 transition-opacity"
      >
        立即邀请好友
      </button>
    </div>
  );
}

function ShareTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#E8F8EE] rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🎁</span>
        <div>
          <p className="text-sm font-semibold text-[#1a1a1a] mb-0.5">邀请即送，购买即返</p>
          <p className="text-xs text-[#555] leading-relaxed">
            好友通过你的链接下单后，你立即获得阶梯返现。邀满 3 位 = 免费拿一套印刷服务！
          </p>
        </div>
      </div>
      <InviteCodeCard />
      <ShareTextCard />
    </div>
  );
}

function RewardsTab() {
  return <RewardsList />;
}

export default function ReferralMePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReferralTab>('progress');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#07C160] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent('/referral/me')}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Top header */}
      <div
        className="bg-white px-4 pb-3 border-b border-[#EFEFEF]"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="返回"
            className="w-11 h-11 flex items-center justify-center text-[#666] -ml-2"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-[#1a1a1a]">我的推广</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-24">
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'share' && <ShareTab />}
        {activeTab === 'rewards' && <RewardsTab />}
      </div>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
