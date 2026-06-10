'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { EarningsCard } from '../components/EarningsCard';
import { MilestoneBar } from '../components/MilestoneBar';
import { FriendStatusList } from '../components/FriendStatusList';
import { ShareTextCard } from '../components/ShareTextCard';
import { RewardsList } from '../components/RewardsList';
import { BottomTabBar, type ReferralTab } from '../components/BottomTabBar';
import { InviteShareModal } from '../components/InviteShareModal';

function ProgressTab() {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <EarningsCard />
      <MilestoneBar />
      <FriendStatusList />

      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="w-full py-4 bg-[#E42313] rounded-2xl text-white font-bold text-base active:opacity-90 transition-opacity"
      >
        立即邀请好友 →
      </button>

      <InviteShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function ShareTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#1C1C1C] rounded-2xl p-4 flex items-start gap-3 border border-[#2A2A2A]">
        <span className="text-2xl flex-shrink-0">🎁</span>
        <div>
          <p className="text-sm font-semibold text-white mb-0.5">邀请即送，购买即返</p>
          <p className="text-xs text-[#666] leading-relaxed">
            好友通过你的链接下单后，你立即获得阶梯返现。邀满 3 位 = 免费拿一套印刷服务！
          </p>
        </div>
      </div>
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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent('/referral/me')}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Top header */}
      <div
        className="bg-[#0D0D0D] px-4 pb-3 border-b border-[#2A2A2A]"
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
          <h1 className="text-base font-semibold text-white">我的推广</h1>
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
