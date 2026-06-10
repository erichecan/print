'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '../lib/inviteCode';

interface Platform {
  id: string;
  label: string;
  icon: string;
  getText: (link: string, name: string) => string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '📘',
    getText: (link, name) =>
      `${name} 推荐 👋 在 PrintNGo 定制印刷，质量超赞！\n\n用我的专属链接下单，首单立享新客优惠 🎁\n\n👇 点击直接进入\n${link}\n\n#PrintNGo #CustomPrinting #Canada`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    getText: (link, name) =>
      `Hey! ${name} here 🙋 Just tried @PrintNGo for custom printing — quality is 🔥\n\nUse my exclusive link for a discount on your first order!\n\n${link}\n\n#PrintNGo #CustomPrinting #CanadianBusiness #PersonalizedGifts`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    getText: (link, name) =>
      `${name} 在用 PrintNGo 做定制周边，质量真的超出预期！👀\n\n点击我的专属链接首单立减 🎁\n\n${link}\n\n#PrintNGo #定制印刷 #好物推荐 #海外华人`,
  },
  {
    id: 'xiaohongshu',
    label: '小红书',
    icon: '📕',
    getText: (link, name) =>
      `【${name} 种草 | PrintNGo 定制印刷】\n个性化印刷，比想象中还好看✨\n\n新客福利：用我的专属链接下单立享优惠 🎁\n\n📎 ${link}\n\n#印刷定制 #个性礼物 #海外华人 #加拿大生活`,
  },
];

interface ShareTextCardProps {
  compact?: boolean;
}

export function ShareTextCard({ compact = false }: ShareTextCardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('facebook');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inviteCode = user ? generateInviteCode(user.id) : 'PNG----';
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/invite?ref=${inviteCode}`
      : `https://printngoplus.com/referral/invite?ref=${inviteCode}`;

  const displayName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email.split('@')[0]
      : '我';

  const active = PLATFORMS.find((p) => p.id === activeTab) ?? PLATFORMS[0];
  const text = active.getText(inviteLink, displayName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopiedId(activeTab);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={compact ? '' : 'bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]'}>
      {!compact && (
        <p className="text-sm font-semibold text-white mb-4">一键分享文案</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveTab(p.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: activeTab === p.id ? '#E42313' : '#242424',
              color: activeTab === p.id ? '#fff' : '#666',
            }}
          >
            <span>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Text preview */}
      <div className="bg-[#141414] rounded-xl p-4 mb-3 border border-[#2A2A2A]">
        <p className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-line">{text}</p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
        style={{
          background: copiedId === activeTab ? 'rgba(245,166,35,0.12)' : '#E42313',
          color: copiedId === activeTab ? '#F5A623' : '#fff',
        }}
      >
        {copiedId === activeTab ? '✓ 已复制文案' : `复制 ${active.label} 文案`}
      </button>
    </div>
  );
}
