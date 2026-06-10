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
    return <span className="text-[#666]">{fallback}</span>;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain pointer-events-none"
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
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="flex border-b border-[#2A2A2A]">
        {POSTERS.map((p) => (
          <button
            key={p.platform}
            type="button"
            onClick={() => setActive(p.platform)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              active === p.platform
                ? 'bg-[#E42313] text-white'
                : 'bg-[#242424] text-[#666] hover:bg-[#2A2A2A]'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="p-6">
        <div className="relative mx-auto mb-4 aspect-[4/3] max-h-[420px] w-full bg-[#141414] flex items-center justify-center text-center px-4 border border-[#2A2A2A] rounded-xl overflow-hidden">
          {current.imageUrl ? (
            <PosterImage
              src={current.imageUrl}
              alt={current.title}
              fallback={current.imagePlaceholder}
            />
          ) : (
            <span className="text-[#666]">{current.imagePlaceholder}</span>
          )}
        </div>
        <p className="text-sm text-[#A0A0A0]">{current.copy}</p>
      </div>
    </div>
  );
}
