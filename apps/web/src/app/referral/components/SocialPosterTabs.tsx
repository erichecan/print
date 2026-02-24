/**
 * 社交平台海报切换 - INS / Facebook / 小红书
 * 切换平台显示对应活动宣传海报与文案
 * 2026-02-21 创建
 */
'use client';

import { useState } from 'react';
import type { SocialPlatform, SocialPoster } from '@/types/referral';

const POSTERS: SocialPoster[] = [
  {
    platform: 'ins',
    title: 'Instagram',
    copy: '限时邀请好友享专属福利，你买我奖，一起赚！',
    imagePlaceholder: 'INS 活动海报',
  },
  {
    platform: 'facebook',
    title: 'Facebook',
    copy: 'Invite friends & earn rewards. Share this deal on Facebook!',
    imagePlaceholder: 'FB 活动海报',
  },
  {
    platform: 'xiaohongshu',
    title: '小红书',
    copy: '邀请好友下单，你拿返现。发小红书种草还能再赚一波～',
    imagePlaceholder: '小红书活动海报',
  },
];

export function SocialPosterTabs() {
  const [active, setActive] = useState<SocialPlatform>('ins');
  const current = POSTERS.find((p) => p.platform === active) ?? POSTERS[0];

  return (
    <div className="rounded-xl bg-white shadow-lg overflow-hidden">
      <div className="flex border-b border-slate-200">
        {POSTERS.map((p) => (
          <button
            key={p.platform}
            type="button"
            onClick={() => setActive(p.platform)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              active === p.platform
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="p-6">
        <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center text-slate-500 text-center px-4 mb-4">
          {current.imagePlaceholder}
        </div>
        <p className="text-slate-700">{current.copy}</p>
      </div>
    </div>
  );
}
