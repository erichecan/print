/**
 * Referral 支付成功页 - 支付完成后弹出发 INS / Facebook / 小红书
 * 2025-02-20 创建 | 2026-02-21 增加分享弹窗
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShareModal } from '../components/ShareModal';

export default function ReferralSuccessPage() {
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setShareOpen(true);
  }, []);

  return (
    <div className="container mx-auto px-8 py-10 max-w-2xl text-center">
      <div className="p-8 mb-6">
        <p className="text-5xl font-bold text-[#22C55E] mb-4">✓</p>
        <h1 className="text-xl font-bold text-[#0D0D0D] mb-2">支付成功</h1>
        <p className="text-sm text-[#7A7A7A]">
          感谢您的购买，推荐人将获得相应佣金奖励
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="mb-4 w-full bg-[#E42313] px-6 py-3 font-medium text-white hover:bg-[#c51f11]"
      >
        分享到 INS / Facebook / 小红书
      </button>
      <br />
      <Link href="/referral" className="text-[#E42313] hover:text-[#c51f11]">
        返回活动页
      </Link>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="分享到社交平台"
      />
    </div>
  );
}
