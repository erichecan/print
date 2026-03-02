/**
 * 社交平台海报切换 - INS / Facebook / 小红书
 * 海报在 Pencil 中设计，导出后放入 public/referral-posters/ 即可展示
 * 2026-02-21 创建 | 2026-03-02 支持 imageUrl，与 Pencil 三款海报对应
 */
'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import type { SocialPlatform, SocialPoster } from '@/types/referral';

const POSTERS: SocialPoster[] = [
  {
    platform: 'ins',
    title: 'Instagram',
    copy: '限时邀请好友享专属福利，你买我奖，一起赚！',
    imageUrl: '/referral-posters/ins.png',
    imagePlaceholder: 'INS 活动海报',
  },
  {
    platform: 'facebook',
    title: 'Facebook',
    copy: 'Invite friends & earn rewards. Share this deal on Facebook!',
    imageUrl: '/referral-posters/fb.png',
    imagePlaceholder: 'FB 活动海报',
  },
  {
    platform: 'xiaohongshu',
    title: '小红书',
    copy: '邀请好友下单，你拿返现。发小红书种草还能再赚一波～',
    imageUrl: '/referral-posters/xiaohongshu.png',
    imagePlaceholder: '小红书活动海报',
  },
];

function PosterImage({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback?: string;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  if (failed || !src) {
    return <span>{fallback}</span>;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain pointer-events-none" // [2026-03-02 06:29:45] 防止海报层拦截点击，保证 Tab 可切换
      sizes="(max-width: 640px) 100vw, 400px"
      unoptimized
      onError={onError}
    />
  );
}

export function SocialPosterTabs() {
  const [active, setActive] = useState<SocialPlatform>('ins');
  const current = POSTERS.find((p) => p.platform === active) ?? POSTERS[0];

  return (
    <div className="bg-white border border-[#E8E8E8] overflow-hidden">
      <div className="flex border-b border-[#E8E8E8]">
        {POSTERS.map((p) => (
          <button
            key={p.platform}
            type="button"
            onClick={() => setActive(p.platform)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              active === p.platform
                ? 'bg-[#E42313] text-white'
                : 'bg-[#FAFAFA] text-[#7A7A7A] hover:bg-[#F0F0F0]'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="p-6">
        {/* [2026-03-02 06:25:30] 限制海报最大高度，避免图片按原始尺寸撑满整个页面 */}
        <div className="relative mx-auto mb-4 aspect-[4/3] max-h-[420px] w-full bg-[#FAFAFA] flex items-center justify-center text-[#7A7A7A] text-center px-4 border border-[#E8E8E8] overflow-hidden">
          {current.imageUrl ? (
            <PosterImage
              src={current.imageUrl}
              alt={current.title}
              fallback={current.imagePlaceholder}
            />
          ) : (
            current.imagePlaceholder
          )}
        </div>
        <p className="text-sm text-[#0D0D0D]">{current.copy}</p>
      </div>
    </div>
  );
}
