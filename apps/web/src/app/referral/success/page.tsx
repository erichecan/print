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
    <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
      <div className="rounded-xl bg-green-50 border border-green-200 p-8 mb-6">
        <p className="text-4xl mb-2">✓</p>
        <h1 className="text-xl font-bold text-green-800 mb-2">支付成功</h1>
        <p className="text-slate-600">
          感谢您的购买，推荐人将获得相应佣金奖励
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="mb-4 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
      >
        分享到 INS / Facebook / 小红书
      </button>
      <br />
      <Link href="/referral" className="text-indigo-600 hover:text-indigo-700">
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
