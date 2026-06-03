'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '../lib/inviteCode';

const templates = [
  {
    id: 'wechat',
    label: '微信',
    icon: '💬',
    getText: (code: string, link: string) =>
      `我在用 PrintNGo 定制印刷服务，质量超好！\n\n用我的专属邀请码 ${code} 下单，满减立省！\n👇 点击链接直接进入\n${link}`,
  },
  {
    id: 'xiaohongshu',
    label: '小红书',
    icon: '📕',
    getText: (code: string, link: string) =>
      `【种草 | PrintNGo 定制印刷】\n个性化印刷，比想象中还好看✨\n\n新客福利：用我的邀请码 ${code} 下单立享专属优惠 🎁\n\n📎 链接：${link}\n\n#印刷定制 #个性礼物 #海外华人`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    getText: (code: string, link: string) =>
      `Just discovered @PrintNGo for custom printing — quality is 🔥\n\nUse my code ${code} for a discount on your first order! 🎨\n\n${link}\n\n#PrintNGo #CustomPrinting #CanadianBusiness`,
  },
];

export function ShareTextCard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('wechat');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inviteCode = user ? generateInviteCode(user.id) : 'PNG----';
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/invite?ref=${inviteCode}`
      : `https://printngoplus.com/referral/invite?ref=${inviteCode}`;

  const active = templates.find((t) => t.id === activeTab) ?? templates[0];
  const text = active.getText(inviteCode, inviteLink);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopiedId(activeTab);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#1a1a1a] mb-4">一键分享文案</p>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: activeTab === t.id ? '#07C160' : '#F5F5F5',
              color: activeTab === t.id ? '#fff' : '#666',
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Text preview */}
      <div className="bg-[#F5F5F5] rounded-xl p-4 mb-3">
        <p className="text-sm text-[#333] leading-relaxed whitespace-pre-line">{text}</p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
        style={{
          background: copiedId === activeTab ? '#E8F8EE' : '#07C160',
          color: copiedId === activeTab ? '#04954A' : '#fff',
        }}
      >
        {copiedId === activeTab ? '✓ 已复制文案' : '复制文案'}
      </button>
    </div>
  );
}
