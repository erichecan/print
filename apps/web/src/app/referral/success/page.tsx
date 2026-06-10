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
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto text-center">
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-10 mb-6">
        <div className="w-16 h-16 rounded-full bg-[rgba(245,166,35,0.12)] border border-[#F5A623] flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-[#F5A623]">✓</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">支付成功</h1>
        <p className="text-sm text-[#666]">
          感谢您的购买，推荐人将获得相应佣金奖励
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="mb-4 w-full bg-[#E42313] px-6 py-3 font-medium text-white hover:bg-[#c51f11] rounded-xl transition-colors"
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
